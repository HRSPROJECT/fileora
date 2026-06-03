import qrcode from 'qrcode-generator';

/** Returns a data URL for a QR image, or null if the payload is too large */
export function makeQrDataUrl(text, cellSize = 6) {
  if (!text) return null;
  try {
    const qr = qrcode(0, 'L');
    qr.addData(text);
    qr.make();
    const imgTag = qr.createImgTag(cellSize);
    const match = imgTag.match(/src="([^"]+)"/);
    return match ? match[1] : null;
  } catch (err) {
    console.error('[Share QR] generation failed:', err);
    return null;
  }
}

export function isQrFriendlyPayload(text, maxLen = 1200) {
  return Boolean(text && text.length > 0 && text.length <= maxLen);
}
