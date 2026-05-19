import imageCompression from 'browser-image-compression';

export const compressImage = async (file, format = 'image/webp', quality = 0.8, scale = 100) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Basic validation
      if (!file || !file.type.startsWith('image/')) {
        reject(new Error('Invalid file type. Please upload an image.'));
        return;
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

      resolve({
        originalSize: file.size,
        optimizedSize: compressedFile.size,
        savings: ((file.size - compressedFile.size) / file.size) * 100,
        blob: compressedFile,
        originalUrl,
        optimizedUrl,
        format: mimeType
      });

    } catch (error) {
      console.error("Image compression error:", error);
      reject(error);
    }
  });
};

export const formatBytes = (bytes, decimals = 2) => {
  if (!+bytes) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};
