/**
 * smartCompress — single-pass, ultra-aggressive image compression for fast uploads.
 *
 * Rules:
 *  < 50 KB  → skip compression entirely, upload as-is
 *  >= 50 KB → resize to maxWidth and compress at quality 0.5 using WebP (or JPEG fallback)
 *
 * WebP gives 30-40% smaller files than JPEG at same quality,
 * ensuring photos upload quickly even on 2G/slow connections.
 */
export const MB = 1024 * 1024; // exported so other files can use it

export const smartCompress = (file, maxWidth = 900) => {
  if (file.size < 50 * 1024) {
    console.log(`[imageUtils] ${file.name} is very small — skipping compression.`);
    return Promise.resolve(file);
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;

      img.onload = () => {
        let w = img.width;
        let h = img.height;

        // Ultra-aggressive: cap width and use quality 0.5
        if (w > maxWidth) {
          h = Math.round((h * maxWidth) / w);
          w = maxWidth;
        }

        const quality = 0.5; // lower = smaller file = faster upload

        console.log(
          `[imageUtils] Compressing: ${img.width}×${img.height} → ${w}×${h}, quality=${quality}`
        );

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        // Try WebP first (30-40% smaller), fall back to JPEG
        const supportsWebP = canvas.toDataURL('image/webp').startsWith('data:image/webp');
        const mimeType = supportsWebP ? 'image/webp' : 'image/jpeg';

        canvas.toBlob(
          (blob) => {
            if (blob) {
              console.log(`[imageUtils] Compressed to ${(blob.size / 1024).toFixed(1)} KB (${mimeType})`);
              resolve(blob);
            } else {
              resolve(file);
            }
          },
          mimeType,
          quality
        );
      };

      img.onerror = () => resolve(file);
    };

    reader.onerror = () => resolve(file);
  });
};

/**
 * createPreviewUrl — returns an instant local blob URL for optimistic UI.
 * Call URL.revokeObjectURL(url) when the component unmounts or upload finishes.
 */
export const createPreviewUrl = (file) => URL.createObjectURL(file);
