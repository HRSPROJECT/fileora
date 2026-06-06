import { PDFDocument, PDFName, PDFHexString, PDFString, PDFDict, PDFArray, PDFRawStream, PDFNumber, PDFRef, PDFObjectStreamParser, PDFObjectParser, PDFInvalidObject } from 'pdf-lib';
import { md5, RC4, hexToBytes, bytesToHex } from './crypto-rc4';
import {
  aes256CbcDecryptNoPad, aes256EcbDecryptBlock,
  importAES256DecryptKey, aes256CbcDecryptWithKey,
  computeHash2B,
} from './crypto-aes';

// ========== Constants ==========
const PADDING = new Uint8Array([
  0x28, 0xBF, 0x4E, 0x5E, 0x4E, 0x75, 0x8A, 0x41,
  0x64, 0x00, 0x4E, 0x56, 0xFF, 0xFA, 0x01, 0x08,
  0x2E, 0x2E, 0x00, 0xB6, 0xD0, 0x68, 0x3E, 0x80,
  0x2F, 0x0C, 0xA9, 0xFE, 0x64, 0x53, 0x69, 0x7A
]);
const BATCH_SIZE = 100;

// ========== Helper Functions ==========
function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function extractBytes(pdfObj) {
  if (!pdfObj) return null;
  if (pdfObj instanceof PDFHexString) {
    return hexToBytes(pdfObj.asString());
  }
  if (pdfObj instanceof PDFString) {
    return pdfObj.asBytes();
  }
  const str = pdfObj.toString();
  if (str.startsWith('<') && str.endsWith('>')) {
    return hexToBytes(str.slice(1, -1));
  }
  return null;
}

function saslPrepPassword(password) {
  const bytes = new TextEncoder().encode(password);
  return bytes.length > 127 ? bytes.slice(0, 127) : bytes;
}

function readEncryptParams(context) {
  const trailer = context.trailerInfo;
  const encryptRef = trailer.Encrypt;
  if (!encryptRef) return null;

  let encryptDict;
  if (encryptRef instanceof PDFRef) {
    encryptDict = context.lookup(encryptRef);
  } else if (encryptRef instanceof PDFDict) {
    encryptDict = encryptRef;
  } else {
    return null;
  }

  if (!encryptDict || !(encryptDict instanceof PDFDict)) return null;

  const V = encryptDict.get(PDFName.of('V'));
  const R = encryptDict.get(PDFName.of('R'));
  const Length = encryptDict.get(PDFName.of('Length'));
  const P = encryptDict.get(PDFName.of('P'));
  const O = encryptDict.get(PDFName.of('O'));
  const U = encryptDict.get(PDFName.of('U'));

  const version = V ? (typeof V.asNumber === 'function' ? V.asNumber() : Number(V.toString())) : 0;
  const revision = R ? (typeof R.asNumber === 'function' ? R.asNumber() : Number(R.toString())) : 0;
  const permissions = P ? (typeof P.asNumber === 'function' ? P.asNumber() : Number(P.toString())) : 0;
  const ownerKey = extractBytes(O);
  const userKey = extractBytes(U);

  if (!ownerKey || !userKey) {
    throw new Error('Could not read /O or /U values from encryption dictionary');
  }

  let fileId = new Uint8Array(0);
  const idArray = trailer.ID;
  if (idArray) {
    if (Array.isArray(idArray) && idArray.length > 0) {
      fileId = extractBytes(idArray[0]) || new Uint8Array(0);
    } else if (idArray instanceof PDFArray) {
      const firstId = idArray.lookup(0);
      fileId = extractBytes(firstId) || new Uint8Array(0);
    }
  }

  const params = {
    version,
    revision,
    ownerKey,
    userKey,
    permissions,
    fileId,
    encryptRef,
    encryptDict
  };

  if (version === 5 && revision === 6) {
    const OE = encryptDict.get(PDFName.of('OE'));
    const UE = encryptDict.get(PDFName.of('UE'));
    const Perms = encryptDict.get(PDFName.of('Perms'));
    const EncryptMetadata = encryptDict.get(PDFName.of('EncryptMetadata'));

    params.ownerEncryptKey = extractBytes(OE);
    params.userEncryptKey = extractBytes(UE);
    params.perms = extractBytes(Perms);

    if (!params.ownerEncryptKey || !params.userEncryptKey || !params.perms) {
      throw new Error('Missing /OE, /UE, or /Perms in AES-256 encryption dictionary');
    }

    if (EncryptMetadata) {
      const emStr = EncryptMetadata.toString();
      params.encryptMetadata = emStr !== 'false';
    } else {
      params.encryptMetadata = true;
    }

    params.algorithm = 'AES-256';
    params.keyLength = 32;
  } else if (version <= 3 && revision <= 4) {
    let keyLengthBits = Length ? (typeof Length.asNumber === 'function' ? Length.asNumber() : Number(Length.toString())) : 40;
    if (revision >= 3 && !Length) keyLengthBits = 128;
    params.keyLength = keyLengthBits / 8;
    params.algorithm = 'RC4';
  } else {
    throw new Error(`Unsupported encryption: V=${version}, R=${revision}`);
  }

  return params;
}

function padPassword(password) {
  const pwdBytes = typeof password === 'string' ? new TextEncoder().encode(password) : password;
  const padded = new Uint8Array(32);
  if (pwdBytes.length >= 32) {
    padded.set(pwdBytes.slice(0, 32));
  } else {
    padded.set(pwdBytes);
    padded.set(PADDING.slice(0, 32 - pwdBytes.length), pwdBytes.length);
  }
  return padded;
}

function computeEncryptionKey(password, ownerKey, permissions, fileId, revision, keyLength) {
  const paddedPwd = padPassword(password);
  const hashInput = new Uint8Array(paddedPwd.length + ownerKey.length + 4 + fileId.length);
  let offset = 0;
  hashInput.set(paddedPwd, offset);
  offset += paddedPwd.length;
  hashInput.set(ownerKey, offset);
  offset += ownerKey.length;
  hashInput[offset++] = permissions & 0xFF;
  hashInput[offset++] = (permissions >> 8) & 0xFF;
  hashInput[offset++] = (permissions >> 16) & 0xFF;
  hashInput[offset++] = (permissions >> 24) & 0xFF;
  hashInput.set(fileId, offset);

  let hash = md5(hashInput);
  if (revision >= 3) {
    const n = keyLength;
    for (let i = 0; i < 50; i++) {
      hash = md5(hash.slice(0, n));
    }
  }
  return hash.slice(0, keyLength);
}

function validateUserPasswordRC4(password, encryptParams) {
  const { ownerKey, userKey, permissions, fileId, revision, keyLength } = encryptParams;
  const encryptionKey = computeEncryptionKey(password, ownerKey, permissions, fileId, revision, keyLength);

  if (revision === 2) {
    const rc4 = new RC4(encryptionKey);
    const computed = rc4.process(new Uint8Array(PADDING));
    if (arraysEqual(computed, userKey)) return encryptionKey;
  } else {
    const hashInput = new Uint8Array(PADDING.length + fileId.length);
    hashInput.set(PADDING);
    hashInput.set(fileId, PADDING.length);
    const hash = md5(hashInput);

    let result = new RC4(encryptionKey).process(hash);
    for (let i = 1; i <= 19; i++) {
      const iterKey = new Uint8Array(encryptionKey.length);
      for (let j = 0; j < encryptionKey.length; j++) {
        iterKey[j] = encryptionKey[j] ^ i;
      }
      result = new RC4(iterKey).process(result);
    }
    if (arraysEqual(result.slice(0, 16), userKey.slice(0, 16))) return encryptionKey;
  }
  return null;
}

function validateOwnerPasswordRC4(ownerPassword, encryptParams) {
  const { ownerKey, revision, keyLength } = encryptParams;
  const paddedOwner = padPassword(ownerPassword);
  let hash = md5(paddedOwner);
  if (revision >= 3) {
    for (let i = 0; i < 50; i++) {
      hash = md5(hash);
    }
  }
  const ownerDecryptKey = hash.slice(0, keyLength);
  let recoveredUserPwd;
  if (revision === 2) {
    const rc4 = new RC4(ownerDecryptKey);
    recoveredUserPwd = rc4.process(new Uint8Array(ownerKey));
  } else {
    let result = new Uint8Array(ownerKey);
    for (let i = 19; i >= 0; i--) {
      const iterKey = new Uint8Array(ownerDecryptKey.length);
      for (let j = 0; j < ownerDecryptKey.length; j++) {
        iterKey[j] = ownerDecryptKey[j] ^ i;
      }
      result = new RC4(iterKey).process(result);
    }
    recoveredUserPwd = result;
  }
  return validateUserPasswordRC4(recoveredUserPwd, encryptParams);
}

function decryptObjectRC4(data, objectNum, generationNum, encryptionKey) {
  const keyInput = new Uint8Array(encryptionKey.length + 5);
  keyInput.set(encryptionKey);
  keyInput[encryptionKey.length] = objectNum & 0xFF;
  keyInput[encryptionKey.length + 1] = (objectNum >> 8) & 0xFF;
  keyInput[encryptionKey.length + 2] = (objectNum >> 16) & 0xFF;
  keyInput[encryptionKey.length + 3] = generationNum & 0xFF;
  keyInput[encryptionKey.length + 4] = (generationNum >> 8) & 0xFF;

  const objectKey = md5(keyInput);
  const rc4 = new RC4(objectKey.slice(0, Math.min(encryptionKey.length + 5, 16)));
  return rc4.process(data);
}

function decryptStringsRC4(obj, objectNum, generationNum, encryptionKey) {
  if (!obj) return;
  if (obj instanceof PDFString) {
    const originalBytes = obj.asBytes();
    const decrypted = decryptObjectRC4(originalBytes, objectNum, generationNum, encryptionKey);
    obj.value = Array.from(decrypted).map(b => String.fromCharCode(b)).join('');
  } else if (obj instanceof PDFHexString) {
    const originalBytes = obj.asBytes();
    const decrypted = decryptObjectRC4(originalBytes, objectNum, generationNum, encryptionKey);
    obj.value = bytesToHex(decrypted);
  } else if (obj instanceof PDFDict) {
    for (const [key, value] of obj.entries()) {
      const keyName = key.asString();
      if (keyName !== '/Length' && keyName !== '/Filter' && keyName !== '/DecodeParms') {
        decryptStringsRC4(value, objectNum, generationNum, encryptionKey);
      }
    }
  } else if (obj instanceof PDFArray) {
    for (const element of obj.asArray()) {
      decryptStringsRC4(element, objectNum, generationNum, encryptionKey);
    }
  }
}

async function validateUserPasswordAES256(password, encryptParams) {
  const { userKey, userEncryptKey } = encryptParams;
  const validationSalt = userKey.slice(32, 40);
  const hash = await computeHash2B(password, validationSalt, new Uint8Array(0));
  if (!arraysEqual(hash, userKey.slice(0, 32))) return null;

  const keySalt = userKey.slice(40, 48);
  const ueKey = await computeHash2B(password, keySalt, new Uint8Array(0));
  const zeroIV = new Uint8Array(16);
  return await aes256CbcDecryptNoPad(userEncryptKey, ueKey, zeroIV);
}

async function validateOwnerPasswordAES256(password, encryptParams) {
  const { ownerKey, userKey, ownerEncryptKey } = encryptParams;
  const validationSalt = ownerKey.slice(32, 40);
  const hash = await computeHash2B(password, validationSalt, userKey);
  if (!arraysEqual(hash, ownerKey.slice(0, 32))) return null;

  const keySalt = ownerKey.slice(40, 48);
  const oeKey = await computeHash2B(password, keySalt, userKey);
  const zeroIV = new Uint8Array(16);
  return await aes256CbcDecryptNoPad(ownerEncryptKey, oeKey, zeroIV);
}

async function verifyPerms(fileKey, encryptParams) {
  const { perms, permissions, encryptMetadata } = encryptParams;
  try {
    const decrypted = await aes256EcbDecryptBlock(perms, fileKey);
    const p0 = decrypted[0] | (decrypted[1] << 8) | (decrypted[2] << 16) | (decrypted[3] << 24);
    if ((p0 | 0) !== (permissions | 0)) return false;
    const expectedEM = encryptMetadata ? 0x54 : 0x46;
    if (decrypted[8] !== expectedEM) return false;
    if (decrypted[9] !== 0x61 || decrypted[10] !== 0x64 || decrypted[11] !== 0x62) return false;
    return true;
  } catch {
    return false;
  }
}

function collectEncryptedItems(context, encryptRefNum, encryptMetadata) {
  const streamItems = [];
  const stringItems = [];
  const indirectObjects = context.enumerateIndirectObjects();

  for (const [ref, obj] of indirectObjects) {
    const objectNum = ref.objectNumber;
    const generationNum = ref.generationNumber || 0;

    if (encryptRefNum !== null && objectNum === encryptRefNum) continue;

    if (obj instanceof PDFDict && !(obj instanceof PDFRawStream)) {
      const type = obj.get(PDFName.of('Type'));
      if (type && type.toString() === '/Sig') continue;
    }

    if (obj instanceof PDFRawStream && obj.dict) {
      const type = obj.dict.get(PDFName.of('Type'));
      if (type) {
        const typeName = type.toString();
        if (typeName === '/XRef') continue;
        if (typeName === '/Sig') continue;
        if (typeName === '/Metadata' && !encryptMetadata) continue;
      }
    }

    if (obj instanceof PDFRawStream) {
      const streamData = obj.contents;
      if (streamData.length >= 16) {
        streamItems.push({ ref, obj, data: streamData, objectNum, generationNum });
      }
      if (obj.dict) {
        collectStringsFromObject(obj.dict, objectNum, generationNum, stringItems);
      }
    }

    if (!(obj instanceof PDFRawStream)) {
      collectStringsFromObject(obj, objectNum, generationNum, stringItems);
    }
  }

  return { streamItems, stringItems };
}

function collectStringsFromObject(obj, objectNum, generationNum, items) {
  if (!obj) return;
  if (obj instanceof PDFString) {
    const bytes = obj.asBytes();
    if (bytes.length >= 16) {
      items.push({ obj, bytes, type: 'string', objectNum, generationNum });
    }
  } else if (obj instanceof PDFHexString) {
    const bytes = obj.asBytes();
    if (bytes.length >= 16) {
      items.push({ obj, bytes, type: 'hex', objectNum, generationNum });
    }
  } else if (obj instanceof PDFDict) {
    for (const [key, value] of obj.entries()) {
      const keyName = key.asString();
      if (keyName !== '/Length' && keyName !== '/Filter' && keyName !== '/DecodeParms') {
        collectStringsFromObject(value, objectNum, generationNum, items);
      }
    }
  } else if (obj instanceof PDFArray) {
    for (const element of obj.asArray()) {
      collectStringsFromObject(element, objectNum, generationNum, items);
    }
  }
}

async function decryptAES256Blob(data, cryptoKey) {
  const iv = data.slice(0, 16);
  const ciphertext = data.slice(16);
  if (ciphertext.length === 0) return new Uint8Array(0);
  if (ciphertext.length % 16 !== 0) return data;

  try {
    return await aes256CbcDecryptWithKey(ciphertext, cryptoKey, iv);
  } catch {
    return data;
  }
}

async function decryptAllAES256(streamItems, stringItems, cryptoKey) {
  for (let i = 0; i < streamItems.length; i += BATCH_SIZE) {
    const batch = streamItems.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(item => decryptAES256Blob(item.data, cryptoKey))
    );
    for (let j = 0; j < batch.length; j++) {
      batch[j].obj.contents = results[j];
    }
  }

  for (let i = 0; i < stringItems.length; i += BATCH_SIZE) {
    const batch = stringItems.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(item => decryptAES256Blob(item.bytes, cryptoKey))
    );
    for (let j = 0; j < batch.length; j++) {
      const item = batch[j];
      const decrypted = results[j];
      if (item.type === 'string') {
        item.obj.value = Array.from(decrypted).map(b => String.fromCharCode(b)).join('');
      } else {
        item.obj.value = bytesToHex(decrypted);
      }
    }
  }
}

function decryptAllRC4(context, encryptionKey, encryptRefNum) {
  const indirectObjects = context.enumerateIndirectObjects();
  for (const [ref, obj] of indirectObjects) {
    const objectNum = ref.objectNumber;
    const generationNum = ref.generationNumber || 0;
    if (encryptRefNum !== null && objectNum === encryptRefNum) continue;

    if (obj instanceof PDFDict && !(obj instanceof PDFRawStream)) {
      const type = obj.get(PDFName.of('Type'));
      if (type && type.toString() === '/Sig') continue;
    }

    if (obj instanceof PDFRawStream && obj.dict) {
      const type = obj.dict.get(PDFName.of('Type'));
      if (type) {
        const typeName = type.toString();
        if (typeName === '/XRef' || typeName === '/Sig') continue;
      }
    }

    if (obj instanceof PDFRawStream) {
      const streamData = obj.contents;
      obj.contents = decryptObjectRC4(streamData, objectNum, generationNum, encryptionKey);
      if (obj.dict) {
        decryptStringsRC4(obj.dict, objectNum, generationNum, encryptionKey);
      }
    }

    if (!(obj instanceof PDFRawStream)) {
      decryptStringsRC4(obj, objectNum, generationNum, encryptionKey);
    }
  }
}

export async function decryptPDF(pdfBytes, password) {
  try {
    // Load the PDF without attempting to decrypt (let us handle it)
    const pdfDoc = await PDFDocument.load(pdfBytes, {
      ignoreEncryption: true,
      updateMetadata: false
    });

    const context = pdfDoc.context;

    // ========== RESTORE INVALID OBJECTS TO RAW STREAMS BEFORE DECRYPTION ==========
    const initialObjects = context.enumerateIndirectObjects();
    for (const [ref, obj] of initialObjects) {
      if (obj instanceof PDFInvalidObject) {
        const size = obj.sizeInBytes();
        const bytes = new Uint8Array(size);
        obj.copyBytesInto(bytes, 0);
        try {
          const parser = PDFObjectParser.forBytes(bytes, context);
          const parsed = parser.parseObject();
          if (parsed instanceof PDFRawStream) {
            context.assign(ref, parsed);
          }
        } catch (err) {
          // Skip if parsing fails
        }
      }
    }

    // Read encryption parameters
    const encryptParams = readEncryptParams(context);
    if (!encryptParams) {
      throw new Error('This PDF is not encrypted. No /Encrypt dictionary found.');
    }

    const encryptRefNum = (encryptParams.encryptRef instanceof PDFRef)
      ? encryptParams.encryptRef.objectNumber
      : null;

    if (encryptParams.algorithm === 'AES-256') {
      // ========== AES-256 Path ==========
      const pwdBytes = saslPrepPassword(password);

      // Try user password first
      let fileKey = await validateUserPasswordAES256(pwdBytes, encryptParams);

      // If user password fails, try owner password
      if (!fileKey) {
        fileKey = await validateOwnerPasswordAES256(pwdBytes, encryptParams);
      }

      if (!fileKey) {
        throw new Error('Incorrect password. The provided password does not match the user or owner password.');
      }

      // Verify Perms (optional but recommended — warns but doesn't fail)
      await verifyPerms(fileKey, encryptParams);

      // Import key once for bulk decryption
      const cryptoKey = await importAES256DecryptKey(fileKey);

      // Collect all encrypted items (synchronous traversal)
      const { streamItems, stringItems } = collectEncryptedItems(
        context, encryptRefNum, encryptParams.encryptMetadata
      );

      // Decrypt all items in batches (async)
      await decryptAllAES256(streamItems, stringItems, cryptoKey);

    } else {
      // ========== RC4 Path ==========
      // Try user password first
      let encryptionKey = validateUserPasswordRC4(password, encryptParams);

      if (!encryptionKey) {
        encryptionKey = validateOwnerPasswordRC4(password, encryptParams);
      }

      if (!encryptionKey) {
        throw new Error('Incorrect password. The provided password does not match the user or owner password.');
      }

      // Decrypt all objects (synchronous)
      decryptAllRC4(context, encryptionKey, encryptRefNum);
    }

    // ========== RE-PARSE DECRYPTED OBJECT STREAMS ==========
    const indirectObjects = context.enumerateIndirectObjects();
    for (const [, obj] of indirectObjects) {
      if (obj instanceof PDFRawStream && obj.dict) {
        const type = obj.dict.get(PDFName.of('Type'));
        if (type && type.toString() === '/ObjStm') {
          const parser = PDFObjectStreamParser.forStream(obj);
          await parser.parseIntoContext();
        }
      }
    }

    // Remove the /Encrypt entry from the trailer
    delete context.trailerInfo.Encrypt;

    // Save the decrypted PDF
    const decryptedBytes = await pdfDoc.save({
      useObjectStreams: false
    });

    return decryptedBytes;

  } catch (error) {
    if (error.message.includes('not encrypted') ||
        error.message.includes('Incorrect password') ||
        error.message.includes('Unsupported encryption')) {
      throw error;
    }
    throw new Error(`Failed to decrypt PDF: ${error.message}`);
  }
}

export async function isEncrypted(pdfBytes) {
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes, {
      ignoreEncryption: true,
      updateMetadata: false
    });

    const encryptParams = readEncryptParams(pdfDoc.context);

    if (!encryptParams) {
      return { encrypted: false };
    }

    return {
      encrypted: true,
      algorithm: encryptParams.algorithm,
      version: encryptParams.version,
      revision: encryptParams.revision,
      keyLength: encryptParams.keyLength * 8
    };
  } catch (error) {
    throw new Error(`Failed to read PDF: ${error.message}`);
  }
}
