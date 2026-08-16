const MAX_DIMENSION = 512;
const JPEG_QUALITY = 0.85;

/** Stored as a base64 data URL inline in `resumes.content_json` (TEXT, no
 * length cap) and duplicated into every `resume_snapshots` row on each
 * edit — so this is a hard ceiling on the persisted string length, not
 * just a nicety. ~400KB comfortably fits a 512px JPEG; only pathological
 * inputs (huge originals that don't compress well) should ever hit it. */
export const MAX_PHOTO_DATA_URL_LENGTH = 400 * 1024;

/**
 * Downscales an image file to fit within `MAX_DIMENSION` on its longest
 * side — aspect ratio preserved, no cropping — and re-encodes it as JPEG.
 * The profile photo's own display treatment (object-cover, centered) is
 * unaffected; this only shrinks what gets stored.
 */
export function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(
        1,
        MAX_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight)
      );
      const width = Math.round(img.naturalWidth * scale);
      const height = Math.round(img.naturalHeight * scale);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas 2D context unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read image file"));
    };
    img.src = objectUrl;
  });
}
