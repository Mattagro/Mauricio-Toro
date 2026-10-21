import { LayerStatistics } from '../types/geotiff';

export function computeLayerStatistics(
  data: Float32Array,
  pixelWidthMeters: number = 8.1,
  pixelHeightMeters: number = 9.9
): LayerStatistics {
  const total = data.length;
  let validCount = 0;
  let sum = 0;

  // Filter valid finite numbers
  const validValues: number[] = [];
  for (let i = 0; i < total; i++) {
    const v = data[i];
    if (!isNaN(v) && Number.isFinite(v)) {
      validValues.push(v);
      sum += v;
      validCount++;
    }
  }

  if (validCount === 0) {
    return {
      count: total,
      validCount: 0,
      validPercent: 0,
      mean: 0,
      median: 0,
      stdDev: 0,
      min: 0,
      max: 0,
      p2: 0,
      p5: 0,
      p25: 0,
      p75: 0,
      p95: 0,
      p98: 0,
      areaHa: 0,
      areaM2: 0,
    };
  }

  validValues.sort((a, b) => a - b);

  const mean = sum / validCount;

  // Variance & stdDev
  let varSum = 0;
  for (let i = 0; i < validCount; i++) {
    const diff = validValues[i] - mean;
    varSum += diff * diff;
  }
  const stdDev = Math.sqrt(varSum / validCount);

  // Percentile helper
  const getPercentile = (p: number) => {
    const idx = (p / 100) * (validCount - 1);
    const low = Math.floor(idx);
    const high = Math.ceil(idx);
    const weight = idx - low;
    return validValues[low] * (1 - weight) + validValues[high] * weight;
  };

  const min = validValues[0];
  const max = validValues[validCount - 1];
  const median = getPercentile(50);
  const p2 = getPercentile(2);
  const p5 = getPercentile(5);
  const p25 = getPercentile(25);
  const p75 = getPercentile(75);
  const p95 = getPercentile(95);
  const p98 = getPercentile(98);

  const areaM2 = validCount * pixelWidthMeters * pixelHeightMeters;
  const areaHa = areaM2 / 10000;

  return {
    count: total,
    validCount,
    validPercent: (validCount / total) * 100,
    mean,
    median,
    stdDev,
    min,
    max,
    p2,
    p5,
    p25,
    p75,
    p95,
    p98,
    areaHa,
    areaM2,
  };
}

export interface HistogramBin {
  x0: number;
  x1: number;
  midpoint: number;
  count: number;
  percent: number;
}

export function computeHistogram(
  data: Float32Array,
  numBins: number = 40,
  minVal?: number,
  maxVal?: number
): HistogramBin[] {
  const valid: number[] = [];
  for (let i = 0; i < data.length; i++) {
    const v = data[i];
    if (!isNaN(v) && Number.isFinite(v)) {
      valid.push(v);
    }
  }

  if (valid.length === 0) return [];

  let min = minVal;
  let max = maxVal;
  if (min === undefined || max === undefined) {
    min = Infinity;
    max = -Infinity;
    for (const v of valid) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }

  if (min === max) {
    return [{ x0: min, x1: max, midpoint: min, count: valid.length, percent: 100 }];
  }

  const binWidth = (max - min) / numBins;
  const bins: HistogramBin[] = Array.from({ length: numBins }, (_, i) => {
    const x0 = min! + i * binWidth;
    const x1 = x0 + binWidth;
    return {
      x0,
      x1,
      midpoint: (x0 + x1) / 2,
      count: 0,
      percent: 0,
    };
  });

  for (const v of valid) {
    let bIdx = Math.floor((v - min) / binWidth);
    if (bIdx < 0) bIdx = 0;
    if (bIdx >= numBins) bIdx = numBins - 1;
    bins[bIdx].count++;
  }

  for (const b of bins) {
    b.percent = (b.count / valid.length) * 100;
  }

  return bins;
}
