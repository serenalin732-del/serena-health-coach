import { Platform } from 'react-native';

// Opens the device picker/camera (web), then downscales + JPEG-compresses the
// chosen image to keep the upload small, returning a data URL. Web-only — on
// native it resolves to null (the deployed surface is web).
export async function pickMealImage(): Promise<string | null> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return null;

  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    // No `capture` attribute: with it, iOS Safari jumps straight to the camera
    // and never offers the photo library. Without it, tapping the button shows
    // the native chooser (Photo Library / Take Photo / Choose File).
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      try {
        resolve(await compress(file));
      } catch {
        resolve(null);
      }
    };
    input.click();
  });
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function compress(file: File): Promise<string> {
  const dataUrl = await readAsDataURL(file);
  const img = await loadImage(dataUrl);

  const maxDim = 1024;
  let { width, height } = img;
  if (width > maxDim || height > maxDim) {
    const scale = maxDim / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl; // fall back to the original if canvas is unavailable
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', 0.7);
}
