export type IndexCategory = 'Vigor' | 'Clorofila y nitrógeno' | 'Agua' | 'Fisiología' | 'Terreno';

export interface IndexDefinition {
  id: string;
  name: string;
  category: IndexCategory;
  description: string;
  formula?: string;
  defaultColormap: string;
  requiresBands?: string[];
  unit?: string;
  minExpected?: number;
  maxExpected?: number;
}

export interface BandMetadata {
  index: number; // 1-based index
  originalName: string;
  recognizedAs: string | null;
  min: number;
  max: number;
}

export interface LayerStatistics {
  count: number;
  validCount: number;
  validPercent: number;
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  p2: number;
  p5: number;
  p25: number;
  p75: number;
  p95: number;
  p98: number;
  areaHa: number;
  areaM2: number;
}

export interface GeoTransform {
  west: number;
  north: number;
  pixelWidth: number; // in degrees or meters
  pixelHeight: number; // in degrees or meters
  pixelWidthMeters: number; // ~8.1m
  pixelHeightMeters: number; // ~9.9m
  crs: string;
}

export interface GeoRasterData {
  fileName: string;
  width: number;
  height: number;
  bands: Map<string, Float32Array>; // Canonical band or index name -> Float32Array
  rawBandNames: string[];
  recognizedBands: (string | null)[];
  transform: GeoTransform;
  metadata: {
    description?: string;
    capturePeriod?: string;
    lotName?: string;
    cropType?: string;
  };
}

export type ColorStretchMode = 'p2_p98' | 'min_max' | 'custom';

export type ComparisonMode = 'swipe' | 'side_by_side' | 'difference' | 'temporal_trend';

export interface ChangeClassification {
  category: 'strong_gain' | 'slight_gain' | 'stable' | 'slight_loss' | 'strong_loss';
  label: string;
  description: string;
  color: string;
  pixelCount: number;
  hectares: number;
  percentage: number;
}

export interface ComparativeAnalysisResult {
  deltaData: Float32Array;
  deltaStats: LayerStatistics;
  seasonAName: string;
  seasonBName: string;
  indexId: string;
  meanDelta: number;
  medianDelta: number;
  improvedHa: number;
  improvedPercent: number;
  declinedHa: number;
  declinedPercent: number;
  stableHa: number;
  stablePercent: number;
  classifications: ChangeClassification[];
  detectedPatterns: string[];
}

export interface TemporalDataPoint {
  seasonKey: string;
  seasonLabel: string;
  dateRange: string;
  phenologyStage: string;
  mean: number;
  median: number;
  p5: number;
  p95: number;
  stdDev: number;
  fileName: string;
  areaHa: number;
}
