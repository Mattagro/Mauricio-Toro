import { IndexDefinition } from '../types/geotiff';

export const INDICES_CATALOG: IndexDefinition[] = [
  // 1. Vigor
  {
    id: 'NDVI',
    name: 'NDVI',
    category: 'Vigor',
    description: 'Índice de Vegetación de Diferencia Normalizada. Mide vigor fotosintético general y biomasa foliar.',
    formula: '(B8 - B4) / (B8 + B4)',
    defaultColormap: 'RdYlGn',
    requiresBands: ['B8', 'B4'],
    unit: '[-1 a 1]',
    minExpected: 0.1,
    maxExpected: 0.92,
  },
  {
    id: 'GNDVI',
    name: 'GNDVI',
    category: 'Vigor',
    description: 'NDVI Verde (Green NDVI). Más sensible a clorofila en etapas de dosel denso y saturación de NDVI.',
    formula: '(B8 - B3) / (B8 + B3)',
    defaultColormap: 'RdYlGn',
    requiresBands: ['B8', 'B3'],
    unit: '[-1 a 1]',
    minExpected: 0.1,
    maxExpected: 0.88,
  },
  {
    id: 'EVI',
    name: 'EVI',
    category: 'Vigor',
    description: 'Índice de Vegetación Mejorado. Corrige influencia del suelo y efectos atmosféricos en vegetación densa.',
    formula: '2.5 * (B8 - B4) / (B8 + 6*B4 - 7.5*B2 + 1)',
    defaultColormap: 'RdYlGn',
    requiresBands: ['B8', 'B4', 'B2'],
    unit: '[-1 a 1]',
    minExpected: 0.05,
    maxExpected: 0.85,
  },
  {
    id: 'SAVI',
    name: 'SAVI',
    category: 'Vigor',
    description: 'Índice de Vegetación Ajustado al Suelo con factor L=0.5 para huertos con espaciado entre hileras.',
    formula: '1.5 * (B8 - B4) / (B8 + B4 + 0.5)',
    defaultColormap: 'RdYlGn',
    requiresBands: ['B8', 'B4'],
    unit: '[-1 a 1]',
    minExpected: 0.1,
    maxExpected: 0.75,
  },
  {
    id: 'OSAVI',
    name: 'OSAVI',
    category: 'Vigor',
    description: 'SAVI Optimizado con factor de suelo 0.16. Ideal para frutales y avellanos con suelo visible.',
    formula: '(B8 - B4) / (B8 + B4 + 0.16)',
    defaultColormap: 'RdYlGn',
    requiresBands: ['B8', 'B4'],
    unit: '[-1 a 1]',
    minExpected: 0.1,
    maxExpected: 0.80,
  },
  {
    id: 'MSAVI2',
    name: 'MSAVI2',
    category: 'Vigor',
    description: 'SAVI Modificado de segunda generación. Minimiza el brillo del suelo sin requerir calibración manual de L.',
    formula: '(2*B8 + 1 - sqrt((2*B8 + 1)^2 - 8*(B8 - B4))) / 2',
    defaultColormap: 'RdYlGn',
    requiresBands: ['B8', 'B4'],
    unit: '[-1 a 1]',
    minExpected: 0.1,
    maxExpected: 0.82,
  },

  // 2. Clorofila y Nitrógeno
  {
    id: 'NDRE',
    name: 'NDRE',
    category: 'Clorofila y nitrógeno',
    description: 'Diferencia Normalizada de Red Edge. Detecta contenido de clorofila y variaciones de nitrógeno tempranas.',
    formula: '(B8 - B5) / (B8 + B5)',
    defaultColormap: 'RdYlGn',
    requiresBands: ['B8', 'B5'],
    unit: '[-1 a 1]',
    minExpected: 0.15,
    maxExpected: 0.75,
  },
  {
    id: 'GCL',
    name: 'GCL',
    category: 'Clorofila y nitrógeno',
    description: 'Índice de Clorofila Verde (Green Chlorophyll Index). Relación lineal directa con concentración de clorofila.',
    formula: 'B8 / B3 - 1',
    defaultColormap: 'YlGn',
    requiresBands: ['B8', 'B3'],
    unit: '[ratio]',
    minExpected: 0.5,
    maxExpected: 5.5,
  },
  {
    id: 'ReCL',
    name: 'ReCL',
    category: 'Clorofila y nitrógeno',
    description: 'Índice de Clorofila Red Edge (Red-Edge Chlorophyll Index). Muy sensible al estado nutricional del huerto.',
    formula: 'B8 / B5 - 1',
    defaultColormap: 'YlGn',
    requiresBands: ['B8', 'B5'],
    unit: '[ratio]',
    minExpected: 0.4,
    maxExpected: 4.8,
  },
  {
    id: 'ARVI',
    name: 'ARVI',
    category: 'Clorofila y nitrógeno',
    description: 'Índice de Vegetación Resistente a la Atmósfera. Corrige dispersión por aerosoles usando canal azul.',
    formula: '(B8 - (2*B4 - B2)) / (B8 + (2*B4 - B2))',
    defaultColormap: 'RdYlGn',
    requiresBands: ['B8', 'B4', 'B2'],
    unit: '[-1 a 1]',
    minExpected: 0.1,
    maxExpected: 0.9,
  },
  {
    id: 'N_Indicator',
    name: 'N_Indicator',
    category: 'Clorofila y nitrógeno',
    description: 'Indicador de Nitrógeno Foliar. Estimación específica de suficiencia nitrogenada del cultivo.',
    defaultColormap: 'RdYlGn',
    unit: '[índice]',
    minExpected: 0.2,
    maxExpected: 1.0,
  },

  // 3. Agua / Estrés Hídrico
  {
    id: 'NDMI',
    name: 'NDMI',
    category: 'Agua',
    description: 'Índice de Humedad de Diferencia Normalizada. Detecta contenido hídrico foliar en dosel y estrés por riego.',
    formula: '(B8 - B11) / (B8 + B11)',
    defaultColormap: 'BrBG',
    requiresBands: ['B8', 'B11'],
    unit: '[-1 a 1]',
    minExpected: -0.2,
    maxExpected: 0.65,
  },
  {
    id: 'NDWI',
    name: 'NDWI',
    category: 'Agua',
    description: 'Índice de Agua de Diferencia Normalizada (Gao / McFeeters). Contrastes hídricos y humedad superficial.',
    formula: '(B3 - B8) / (B3 + B8)',
    defaultColormap: 'BrBG',
    requiresBands: ['B3', 'B8'],
    unit: '[-1 a 1]',
    minExpected: -0.7,
    maxExpected: 0.3,
  },

  // 4. Fisiología
  {
    id: 'S2_PRI',
    name: 'S2_PRI',
    category: 'Fisiología',
    description: 'Índice de Reflectancia Fotoquímica adaptado a Sentinel-2. Eficiencia del ciclo de xantofilas y fotosíntesis.',
    formula: '(B3 - B5) / (B3 + B5)',
    defaultColormap: 'RdYlGn',
    unit: '[-1 a 1]',
    minExpected: -0.3,
    maxExpected: 0.4,
  },
  {
    id: 'Kcb',
    name: 'Kcb',
    category: 'Fisiología',
    description: 'Coeficiente Basal del Cultivo (FAO-56). Relaciona transpiración del avellano y demanda evaporativa.',
    defaultColormap: 'YlGn',
    unit: '[coef]',
    minExpected: 0.2,
    maxExpected: 1.15,
  },

  // 5. Terreno / Topografía
  {
    id: 'DEM',
    name: 'DEM',
    category: 'Terreno',
    description: 'Modelo Digital de Elevación (SRTM / Copernicus DEM). Altitud topográfica del lote en metros s.n.m.',
    defaultColormap: 'terrain',
    unit: 'm s.n.m.',
    minExpected: 80,
    maxExpected: 220,
  },
  {
    id: 'Slope',
    name: 'Slope',
    category: 'Terreno',
    description: 'Pendiente topográfica del terreno calculada desde DEM. Determina escorrentía superficial y zonas de drenaje.',
    defaultColormap: 'magma',
    unit: 'grados (°)',
    minExpected: 0,
    maxExpected: 18,
  },
];

export const SENTINEL2_BANDS = [
  'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B8A', 'B9', 'B11', 'B12'
];

export function normalizeStr(s: string | null | undefined): string {
  if (!s) return '';
  return String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Canonical recognition dictionary matching Python ALIAS
const ALIAS_MAP: Record<string, string> = {
  pri: 'S2_PRI',
  s2pri: 'S2_PRI',
  nindicador: 'N_Indicator',
  nindicator: 'N_Indicator',
  nind: 'N_Indicator',
  elevation: 'DEM',
  elev: 'DEM',
  altitude: 'DEM',
  alt: 'DEM',
  pendiente: 'Slope',
  slope: 'Slope',
  slp: 'Slope',
};

// Seed catalog and band aliases
for (const idx of INDICES_CATALOG) {
  ALIAS_MAP[normalizeStr(idx.id)] = idx.id;
  ALIAS_MAP[normalizeStr(idx.name)] = idx.id;
}
for (const b of SENTINEL2_BANDS) {
  ALIAS_MAP[normalizeStr(b)] = b;
}

/**
 * Recognizes a band name from file header to canonical name.
 * Tolerates date prefixes (e.g. 20251001_NDVI) or suffixes (NDVI_mean, NDVI_median).
 */
export function recognizeBandName(rawName: string | null | undefined): string | null {
  if (!rawName) return null;
  const str = String(rawName).trim();
  const rawNorm = normalizeStr(str);
  if (ALIAS_MAP[rawNorm]) {
    return ALIAS_MAP[rawNorm];
  }

  // Tokenize by non-alphanumeric
  const tokens = str.split(/[^A-Za-z0-9]+/).filter(t => t.length > 0 && isNaN(Number(t)));
  const joinedTokens = normalizeStr(tokens.join(''));
  if (ALIAS_MAP[joinedTokens]) {
    return ALIAS_MAP[joinedTokens];
  }

  for (const token of tokens) {
    const tokenNorm = normalizeStr(token);
    if (ALIAS_MAP[tokenNorm]) {
      return ALIAS_MAP[tokenNorm];
    }
  }

  // Check substring contains known index
  for (const idx of INDICES_CATALOG) {
    const idNorm = normalizeStr(idx.id);
    if (rawNorm.includes(idNorm)) {
      return idx.id;
    }
  }

  for (const b of SENTINEL2_BANDS) {
    const bNorm = normalizeStr(b);
    if (rawNorm === bNorm || rawNorm.endsWith(bNorm) || rawNorm.startsWith(bNorm)) {
      return b;
    }
  }

  return null;
}

export const BASE_FORMULAS: Record<string, string> = {
  NDVI: '(B8 - B4) / (B8 + B4)',
  GNDVI: '(B8 - B3) / (B8 + B3)',
  EVI: '2.5 * (B8 - B4) / (B8 + 6*B4 - 7.5*B2 + 1)',
  SAVI: '1.5 * (B8 - B4) / (B8 + B4 + 0.5)',
  OSAVI: '(B8 - B4) / (B8 + B4 + 0.16)',
  NDRE: '(B8 - B5) / (B8 + B5)',
  GCL: 'B8 / B3 - 1',
  ARVI: '(B8 - (2*B4 - B2)) / (B8 + (2*B4 - B2))',
  MSAVI2: '(2*B8 + 1 - Math.sqrt(Math.max(0, Math.pow(2*B8 + 1, 2) - 8*(B8 - B4)))) / 2',
  NDMI: '(B8 - B11) / (B8 + B11)',
};

/**
 * Computes layer from reflectance bands if not available directly in the file.
 */
export function calculateIndexFromBands(
  indexId: string,
  availableBands: Map<string, Float32Array>,
  width: number,
  height: number,
  userFormulas: Record<string, string> = {}
): { data: Float32Array; source: string } | null {
  const formula = userFormulas[indexId] || BASE_FORMULAS[indexId];
  if (!formula) {
    return null;
  }

  // Find all band tokens like B2, B3, B4, B5, B8, B11, B12, B8A
  const matches = formula.match(/\bB\d+A?\b/g) || [];
  const requiredBands = Array.from(new Set(matches));

  for (const b of requiredBands) {
    if (!availableBands.has(b)) {
      return null;
    }
  }

  const length = width * height;
  const result = new Float32Array(length);

  // Check if reflectances are scaled x10000
  let scaleFactor = 1.0;
  const sampleBand = availableBands.get(requiredBands[0])!;
  let maxSample = -Infinity;
  for (let i = 0; i < Math.min(1000, sampleBand.length); i++) {
    const v = sampleBand[i];
    if (!isNaN(v) && v > maxSample) maxSample = v;
  }
  if (maxSample > 2.0) {
    scaleFactor = 10000.0;
  }

  // Pre-extract band arrays
  const bandArrays: Record<string, Float32Array> = {};
  for (const b of requiredBands) {
    bandArrays[b] = availableBands.get(b)!;
  }

  // Optimized execution for standard formulas
  for (let i = 0; i < length; i++) {
    let hasNan = false;
    for (const b of requiredBands) {
      if (isNaN(bandArrays[b][i])) {
        hasNan = true;
        break;
      }
    }
    if (hasNan) {
      result[i] = NaN;
      continue;
    }

    const b2 = (bandArrays['B2'] ? bandArrays['B2'][i] : 0) / scaleFactor;
    const b3 = (bandArrays['B3'] ? bandArrays['B3'][i] : 0) / scaleFactor;
    const b4 = (bandArrays['B4'] ? bandArrays['B4'][i] : 0) / scaleFactor;
    const b5 = (bandArrays['B5'] ? bandArrays['B5'][i] : 0) / scaleFactor;
    const b8 = (bandArrays['B8'] ? bandArrays['B8'][i] : 0) / scaleFactor;
    const b11 = (bandArrays['B11'] ? bandArrays['B11'][i] : 0) / scaleFactor;

    let val = NaN;
    if (indexId === 'NDVI') {
      const denom = b8 + b4;
      val = Math.abs(denom) > 1e-6 ? (b8 - b4) / denom : NaN;
    } else if (indexId === 'GNDVI') {
      const denom = b8 + b3;
      val = Math.abs(denom) > 1e-6 ? (b8 - b3) / denom : NaN;
    } else if (indexId === 'EVI') {
      const denom = b8 + 6 * b4 - 7.5 * b2 + 1;
      val = Math.abs(denom) > 1e-6 ? 2.5 * (b8 - b4) / denom : NaN;
    } else if (indexId === 'SAVI') {
      const denom = b8 + b4 + 0.5;
      val = Math.abs(denom) > 1e-6 ? 1.5 * (b8 - b4) / denom : NaN;
    } else if (indexId === 'OSAVI') {
      const denom = b8 + b4 + 0.16;
      val = Math.abs(denom) > 1e-6 ? (b8 - b4) / denom : NaN;
    } else if (indexId === 'NDRE') {
      const denom = b8 + b5;
      val = Math.abs(denom) > 1e-6 ? (b8 - b5) / denom : NaN;
    } else if (indexId === 'GCL') {
      val = Math.abs(b3) > 1e-6 ? (b8 / b3 - 1) : NaN;
    } else if (indexId === 'ARVI') {
      const rb = 2 * b4 - b2;
      const denom = b8 + rb;
      val = Math.abs(denom) > 1e-6 ? (b8 - rb) / denom : NaN;
    } else if (indexId === 'MSAVI2') {
      const term = Math.pow(2 * b8 + 1, 2) - 8 * (b8 - b4);
      val = term >= 0 ? (2 * b8 + 1 - Math.sqrt(term)) / 2 : NaN;
    } else if (indexId === 'NDMI') {
      const denom = b8 + b11;
      val = Math.abs(denom) > 1e-6 ? (b8 - b11) / denom : NaN;
    } else if (userFormulas[indexId]) {
      // Custom user formula
      try {
        const evalFunc = new Function(
          'B2', 'B3', 'B4', 'B5', 'B8', 'B11',
          `return (${formula.replace(/np\.sqrt/g, 'Math.sqrt').replace(/\^/g, '**')});`
        );
        val = evalFunc(b2, b3, b4, b5, b8, b11);
      } catch {
        val = NaN;
      }
    }

    result[i] = Number.isFinite(val) ? val : NaN;
  }

  return {
    data: result,
    source: `calculado: ${indexId} = ${formula}`
  };
}
