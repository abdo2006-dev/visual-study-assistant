/**
 * Client-only: resizes to a max dimension and re-encodes as JPEG via
 * Canvas, so uploads stay small (spec section 18 cost control) without a
 * third-party compression library.
 */

export interface CompressedImage {
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
  mimeType: string;
}

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;
const MIME_TYPE = "image/jpeg";

export async function compressImage(file: File | Blob): Promise<CompressedImage> {
  const image = await loadImage(file);
  const { width, height } = fitDimensions(
    image.naturalWidth,
    image.naturalHeight,
    MAX_DIMENSION
  );

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas is not supported in this browser.");
  }
  ctx.drawImage(image, 0, 0, width, height);

  const [blob, dataUrl] = await Promise.all([
    canvasToBlob(canvas, MIME_TYPE, JPEG_QUALITY),
    Promise.resolve(canvas.toDataURL(MIME_TYPE, JPEG_QUALITY)),
  ]);

  return { dataUrl, blob, width, height, mimeType: MIME_TYPE };
}

function fitDimensions(width: number, height: number, maxDimension: number) {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height };
  }
  const scale = maxDimension / Math.max(width, height);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

function loadImage(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image file."));
    };
    image.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not process that image."));
      },
      type,
      quality
    );
  });
}

/** Strips the "data:<mime>;base64," prefix, for sending to the server. */
export function dataUrlToBase64(dataUrl: string): string {
  const commaIndex = dataUrl.indexOf(",");
  return commaIndex === -1 ? dataUrl : dataUrl.slice(commaIndex + 1);
}
