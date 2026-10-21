import { getInterpolatedColor } from './colormaps';

export function createRasterDataUrl(
  data: Float32Array,
  width: number,
  height: number,
  colormap: string,
  vmin: number,
  vmax: number,
  opacity: number = 0.95
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const imgData = ctx.createImageData(width, height);
  const pixels = imgData.data;
  const range = vmax - vmin || 1;

  for (let i = 0; i < data.length; i++) {
    const v = data[i];
    const pIdx = i * 4;

    if (isNaN(v) || !Number.isFinite(v)) {
      pixels[pIdx] = 0;
      pixels[pIdx + 1] = 0;
      pixels[pIdx + 2] = 0;
      pixels[pIdx + 3] = 0;
    } else {
      const norm = Math.max(0, Math.min(1, (v - vmin) / range));
      const [r, g, b] = getInterpolatedColor(norm, colormap);
      pixels[pIdx] = r;
      pixels[pIdx + 1] = g;
      pixels[pIdx + 2] = b;
      pixels[pIdx + 3] = Math.round(opacity * 255);
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}

export function createRgbCompositeDataUrl(
  redBand: Float32Array,
  greenBand: Float32Array,
  blueBand: Float32Array,
  width: number,
  height: number,
  opacity: number = 0.95
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const imgData = ctx.createImageData(width, height);
  const pixels = imgData.data;

  // Find min/max for auto stretch
  let maxR = 0.001;
  let maxG = 0.001;
  let maxB = 0.001;

  for (let i = 0; i < redBand.length; i += 10) {
    if (!isNaN(redBand[i]) && redBand[i] > maxR) maxR = redBand[i];
    if (!isNaN(greenBand[i]) && greenBand[i] > maxG) maxG = greenBand[i];
    if (!isNaN(blueBand[i]) && blueBand[i] > maxB) maxB = blueBand[i];
  }

  // Handle x10000 scale if present
  const scaleR = maxR > 2.0 ? 3000.0 : 0.3;
  const scaleG = maxG > 2.0 ? 3000.0 : 0.3;
  const scaleB = maxB > 2.0 ? 3000.0 : 0.3;

  for (let i = 0; i < redBand.length; i++) {
    const r = redBand[i];
    const g = greenBand[i];
    const b = blueBand[i];
    const pIdx = i * 4;

    if (isNaN(r) || isNaN(g) || isNaN(b)) {
      pixels[pIdx] = 0;
      pixels[pIdx + 1] = 0;
      pixels[pIdx + 2] = 0;
      pixels[pIdx + 3] = 0;
    } else {
      pixels[pIdx] = Math.min(255, Math.max(0, Math.round((r / scaleR) * 255)));
      pixels[pIdx + 1] = Math.min(255, Math.max(0, Math.round((g / scaleG) * 255)));
      pixels[pIdx + 2] = Math.min(255, Math.max(0, Math.round((b / scaleB) * 255)));
      pixels[pIdx + 3] = Math.round(opacity * 255);
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}
