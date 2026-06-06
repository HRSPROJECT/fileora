import imageCompression from 'browser-image-compression';

const IMAGE_COMPRESSION_LIB_URL = '/browser-image-compression.js';

export const compressImage = async (file, format = 'image/webp', quality = 0.8, scale = 100) => {
  try {
      // Basic validation
      if (!file || !file.type.startsWith('image/')) {
        throw new Error('Invalid file type. Please upload an image.');
      }

      // Get original dimensions to apply scale
      const tempUrl = URL.createObjectURL(file);
      const img = new Image();
      img.src = tempUrl;
      await new Promise((res) => {
        img.onload = res;
        img.onerror = res;
      });
      URL.revokeObjectURL(tempUrl);
      
      const maxOriginalDimension = Math.max(img.width || 3840, img.height || 3840);
      const targetDimension = Math.floor(maxOriginalDimension * (scale / 100));

      let mimeType = 'image/webp';
      if (format.toLowerCase() === 'jpeg') mimeType = 'image/jpeg';
      else if (format.toLowerCase() === 'png') mimeType = 'image/png';

      const options = {
        maxSizeMB: Math.max(file.size / 1024 / 1024, 0.05), // Don't strictly force MB size limit on quality
        maxWidthOrHeight: Math.min(targetDimension, 3840), // Apply scale, max 4K
        useWebWorker: true,
        libURL: IMAGE_COMPRESSION_LIB_URL,
        fileType: mimeType,
        initialQuality: quality,
        alwaysKeepResolution: scale === 100 // Keep exact resolution if scale is 100
      };

      let compressedFile = await imageCompression(file, options);

      // Failsafe: If the output is somehow LARGER than the original, 
      // AND they didn't request a format change (e.g. they aren't converting a highly optimized WebP to a PNG),
      // then just return the original file to guarantee we never accidentally increase the file size on the same format.
      if (compressedFile.size >= file.size && file.type === mimeType) {
        compressedFile = file;
      }

      // Calculate new dimensions (optional, but good for UI if needed)
      // browser-image-compression might have resized it
      
      const originalUrl = URL.createObjectURL(file);
      const optimizedUrl = URL.createObjectURL(compressedFile);

      return {
        originalSize: file.size,
        optimizedSize: compressedFile.size,
        savings: ((file.size - compressedFile.size) / file.size) * 100,
        blob: compressedFile,
        originalUrl,
        optimizedUrl,
        format: mimeType
      };

    } catch (error) {
      console.error("Image compression error:", error);
      throw error;
    }
};

export const formatBytes = (bytes, decimals = 2) => {
  if (!+bytes) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

export const MAX_IMAGE_SIZE = 50 * 1024 * 1024;

export const extensionForType = (type) => {
  if (type === 'image/jpeg') return 'jpg';
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  if (type === 'image/avif') return 'avif';
  return 'png';
};

export const mimeForFormat = (format) => {
  const value = format.toLowerCase();
  if (value === 'jpg' || value === 'jpeg') return 'image/jpeg';
  if (value === 'png') return 'image/png';
  if (value === 'webp') return 'image/webp';
  if (value === 'avif') return 'image/avif';
  return 'image/png';
};

export const loadImage = (file) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => resolve({ image, url });
  image.onerror = () => {
    URL.revokeObjectURL(url);
    reject(new Error('Could not read this image. Try a different file.'));
  };
  image.src = url;
});

export const canvasToBlob = (canvas, mimeType, quality = 0.9) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (!blob) reject(new Error('This browser could not export the image.'));
    else resolve(blob);
  }, mimeType, quality);
});

export const resizeImage = async (file, width, height, outputFormat = 'webp', quality = 0.9) => {
  const { image, url } = await loadImage(file);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(url);
  return canvasToBlob(canvas, mimeForFormat(outputFormat), quality);
};

export const convertImage = async (file, outputFormat = 'webp', quality = 0.9) => {
  const { image, url } = await loadImage(file);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  if (outputFormat.toLowerCase() === 'jpg' || outputFormat.toLowerCase() === 'jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(image, 0, 0);
  URL.revokeObjectURL(url);
  return canvasToBlob(canvas, mimeForFormat(outputFormat), quality);
};

export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const basename = (filename) => filename.replace(/\.[^/.]+$/, '') || filename;
