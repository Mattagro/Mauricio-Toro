import { GeoRasterData, GeoTransform } from '../types/geotiff';

export interface SeasonInfo {
  key: string;
  name: string;
  fileName: string;
  period: string;
  stage: string;
  year: number;
}

export const COMPARATIVE_SEASONS_INFO: SeasonInfo[] = [
  {
    key: '2025_2026',
    name: 'Temporada 2025–2026 (Actual)',
    fileName: 'AvellsFlor_nov25ene26.tif',
    period: 'Noviembre 2025 – Enero 2026',
    stage: 'Floración y cuaja (Máximo vigor)',
    year: 2026,
  },
  {
    key: '2024_2025',
    name: 'Temporada 2024–2025 (Año Previo)',
    fileName: 'AvellsFlor_nov24ene25.tif',
    period: 'Noviembre 2024 – Enero 2025',
    stage: 'Floración y cuaja (Desarrollo intermedio)',
    year: 2025,
  },
  {
    key: '2023_2024',
    name: 'Temporada 2023–2024 (Histórica - 2 años)',
    fileName: 'AvellsFlor_nov23ene24.tif',
    period: 'Noviembre 2023 – Enero 2024',
    stage: 'Floración y cuaja (Etapa juvenil / Estrés estival)',
    year: 2024,
  },
  {
    key: 'post_cosecha_2025',
    name: 'Post-Cosecha 2025 (Otoño)',
    fileName: 'AvellsFlor_mar25abr25.tif',
    period: 'Marzo 2025 – Abril 2025',
    stage: 'Senescencia foliar pre-dormancia',
    year: 2025,
  },
];

/**
 * Creates a GeoRasterData for a specific season of the 131 ha Avellanos parcel.
 */
export function createDatasetForSeason(seasonKey: string = '2025_2026'): GeoRasterData {
  const width = 148;
  const height = 152;
  const totalPixels = width * height;

  // Real pixel size at ~35.43°S
  const pixelWidthMeters = 8.1;
  const pixelHeightMeters = 9.9;

  // Target exactly ~131 ha = 1,310,000 m² (16,336 valid pixels)
  const targetValidPixels = 16336;

  // Geographic coordinates
  const west = -71.6620;
  const north = -35.4190;
  const degPerMeterLat = 1 / 110940;
  const degPerMeterLon = 1 / (111320 * Math.cos((-35.43 * Math.PI) / 180));
  const pixelWidthDeg = pixelWidthMeters * degPerMeterLon;
  const pixelHeightDeg = pixelHeightMeters * degPerMeterLat;

  const transform: GeoTransform = {
    west,
    north,
    pixelWidth: pixelWidthDeg,
    pixelHeight: pixelHeightDeg,
    pixelWidthMeters,
    pixelHeightMeters,
    crs: 'EPSG:4326 (WGS 84 / UTM 19S)',
  };

  // Generate realistic field parcel polygon mask
  const mask = new Uint8Array(totalPixels);
  const distancesFromCenter = new Float32Array(totalPixels);

  const cx = width * 0.49;
  const cy = height * 0.51;

  const candidates: { idx: number; score: number }[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const rad = 18 * (Math.PI / 180);
      const nx = (x - cx) * Math.cos(rad) - (y - cy) * Math.sin(rad);
      const ny = (x - cx) * Math.sin(rad) + (y - cy) * Math.cos(rad);

      const rx = 52.0;
      const ry = 62.0;
      const d = Math.pow(Math.abs(nx) / rx, 2.6) + Math.pow(Math.abs(ny) / ry, 2.2);

      const road1 = Math.abs(ny - 0.2 * nx + 12) < 1.3;
      const road2 = Math.abs(nx + 8) < 1.2;

      let score = d;
      if (road1 || road2) {
        score += 0.8;
      }
      candidates.push({ idx, score });
    }
  }

  candidates.sort((a, b) => a.score - b.score);
  for (let i = 0; i < targetValidPixels && i < candidates.length; i++) {
    mask[candidates[i].idx] = 1;
    distancesFromCenter[candidates[i].idx] = candidates[i].score;
  }

  // Band containers (all 29 bands)
  const bandNames = [
    'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B8A', 'B9', 'B11', 'B12',
    'DEM', 'Slope',
    'NDVI', 'GNDVI', 'EVI', 'SAVI', 'OSAVI', 'NDRE', 'GCL', 'ReCL', 'ARVI', 'MSAVI2',
    'S2_PRI', 'NDMI', 'NDWI', 'Kcb', 'N_Indicator'
  ];

  const bands = new Map<string, Float32Array>();
  for (const name of bandNames) {
    bands.set(name, new Float32Array(totalPixels));
  }

  const b1 = bands.get('B1')!;
  const b2 = bands.get('B2')!;
  const b3 = bands.get('B3')!;
  const b4 = bands.get('B4')!;
  const b5 = bands.get('B5')!;
  const b6 = bands.get('B6')!;
  const b7 = bands.get('B7')!;
  const b8 = bands.get('B8')!;
  const b8a = bands.get('B8A')!;
  const b9 = bands.get('B9')!;
  const b11 = bands.get('B11')!;
  const b12 = bands.get('B12')!;
  const dem = bands.get('DEM')!;
  const slope = bands.get('Slope')!;

  const ndvi = bands.get('NDVI')!;
  const gndvi = bands.get('GNDVI')!;
  const evi = bands.get('EVI')!;
  const savi = bands.get('SAVI')!;
  const osavi = bands.get('OSAVI')!;
  const ndre = bands.get('NDRE')!;
  const gcl = bands.get('GCL')!;
  const recl = bands.get('ReCL')!;
  const arvi = bands.get('ARVI')!;
  const msavi2 = bands.get('MSAVI2')!;
  const s2pri = bands.get('S2_PRI')!;
  const ndmi = bands.get('NDMI')!;
  const ndwi = bands.get('NDWI')!;
  const kcb = bands.get('Kcb')!;
  const nIndicator = bands.get('N_Indicator')!;

  // Multi-temporal modifiers per season:
  // 2025_2026: Reference high performance (mean vigor offset 0.0)
  // 2024_2025: Intermediate growth (-0.06 mean vigor offset, East slope slightly lower)
  // 2023_2024: Historic younger orchard (-0.14 mean vigor offset, higher heterogeneity)
  // post_cosecha_2025: Autumn senescence (-0.26 mean vigor offset, moisture drop)
  let seasonVigorOffset = 0.0;
  let eastSlopeStressFactor = 0.0;
  let moistureShift = 0.0;

  if (seasonKey === '2024_2025') {
    seasonVigorOffset = -0.065;
    eastSlopeStressFactor = 0.04;
    moistureShift = -0.03;
  } else if (seasonKey === '2023_2024') {
    seasonVigorOffset = -0.135;
    eastSlopeStressFactor = 0.08;
    moistureShift = -0.07;
  } else if (seasonKey === 'post_cosecha_2025') {
    seasonVigorOffset = -0.250;
    eastSlopeStressFactor = 0.02;
    moistureShift = -0.15;
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (!mask[idx]) {
        for (const name of bandNames) {
          bands.get(name)![idx] = NaN;
        }
        continue;
      }

      const xNorm = x / width;
      const yNorm = y / height;

      // Topography is constant across all seasons (DEM & Slope)
      const elev = 152.0 + 34.0 * Math.sin(xNorm * 1.8 + 0.3) + 12.0 * Math.cos(yNorm * 2.1);
      dem[idx] = parseFloat(elev.toFixed(1));

      const slp = 2.8 + 4.2 * Math.abs(Math.sin(xNorm * 3.2)) + 2.0 * Math.cos(yNorm * 2.5);
      slope[idx] = parseFloat(slp.toFixed(2));

      // Spatial base vigor pattern
      const lowFreqVigor = 0.66 + 0.16 * Math.sin(xNorm * 3.5 + 0.5) * Math.cos(yNorm * 2.8)
        - 0.08 * (distancesFromCenter[idx] > 0.85 ? 0.15 : 0);
      const rowPattern = 0.035 * Math.sin((x * 0.95 + y * 0.28) * Math.PI);
      const microNoise = 0.025 * (Math.sin(x * 12.5 + y * 8.3) * Math.cos(x * 7.1 - y * 11.2));

      // Apply historical season evolution
      // Example: East slope (higher xNorm) had water deficit in 2023/2024 before drip irrigation expansion
      const localizedImpact = eastSlopeStressFactor * Math.max(0, xNorm - 0.45);
      const modulatedVigor = lowFreqVigor + rowPattern + microNoise + seasonVigorOffset - localizedImpact;
      const baseVigor = Math.max(0.18, Math.min(0.94, modulatedVigor));

      // Sentinel-2 reflectances
      const b2Val = 0.048 - 0.022 * baseVigor;
      const b3Val = 0.082 - 0.028 * baseVigor;
      const b4Val = 0.058 - 0.038 * baseVigor;
      const b5Val = 0.125 + 0.110 * baseVigor;
      const b6Val = 0.230 + 0.140 * baseVigor;
      const b7Val = 0.310 + 0.160 * baseVigor;
      const b8Val = 0.320 + 0.260 * baseVigor;
      const b8aVal = 0.330 + 0.250 * baseVigor;
      const b11Val = 0.220 - 0.080 * baseVigor - moistureShift * 0.4;
      const b12Val = 0.140 - 0.060 * baseVigor - moistureShift * 0.3;

      // Scaled x10000
      b1[idx] = Math.round(b2Val * 9500);
      b2[idx] = Math.round(b2Val * 10000);
      b3[idx] = Math.round(b3Val * 10000);
      b4[idx] = Math.round(b4Val * 10000);
      b5[idx] = Math.round(b5Val * 10000);
      b6[idx] = Math.round(b6Val * 10000);
      b7[idx] = Math.round(b7Val * 10000);
      b8[idx] = Math.round(b8Val * 10000);
      b8a[idx] = Math.round(b8aVal * 10000);
      b9[idx] = Math.round(0.015 * 10000);
      b11[idx] = Math.round(b11Val * 10000);
      b12[idx] = Math.round(b12Val * 10000);

      // Índices
      const ndviVal = (b8Val - b4Val) / (b8Val + b4Val);
      ndvi[idx] = parseFloat(ndviVal.toFixed(4));

      const gndviVal = (b8Val - b3Val) / (b8Val + b3Val);
      gndvi[idx] = parseFloat(gndviVal.toFixed(4));

      const eviDenom = b8Val + 6 * b4Val - 7.5 * b2Val + 1;
      evi[idx] = parseFloat((2.5 * (b8Val - b4Val) / eviDenom).toFixed(4));

      savi[idx] = parseFloat((1.5 * (b8Val - b4Val) / (b8Val + b4Val + 0.5)).toFixed(4));
      osavi[idx] = parseFloat(((b8Val - b4Val) / (b8Val + b4Val + 0.16)).toFixed(4));
      ndre[idx] = parseFloat(((b8Val - b5Val) / (b8Val + b5Val)).toFixed(4));
      gcl[idx] = parseFloat((b8Val / b3Val - 1).toFixed(3));
      recl[idx] = parseFloat((b8Val / b5Val - 1).toFixed(3));

      const rb = 2 * b4Val - b2Val;
      arvi[idx] = parseFloat(((b8Val - rb) / (b8Val + rb)).toFixed(4));

      const msaviTerm = Math.pow(2 * b8Val + 1, 2) - 8 * (b8Val - b4Val);
      msavi2[idx] = parseFloat(((2 * b8Val + 1 - Math.sqrt(Math.max(0, msaviTerm))) / 2).toFixed(4));

      s2pri[idx] = parseFloat(((b3Val - b5Val) / (b3Val + b5Val)).toFixed(4));
      ndmi[idx] = parseFloat(((b8Val - b11Val) / (b8Val + b11Val)).toFixed(4));
      ndwi[idx] = parseFloat(((b3Val - b8Val) / (b3Val + b8Val)).toFixed(4));

      const kcbVal = 0.32 + 0.85 * (ndviVal - 0.2) / 0.7;
      kcb[idx] = parseFloat(Math.max(0.18, Math.min(1.15, kcbVal)).toFixed(3));

      const nInd = 0.28 + 0.72 * (ndre[idx] * 0.6 + recl[idx] * 0.12);
      nIndicator[idx] = parseFloat(Math.max(0.15, Math.min(1.0, nInd)).toFixed(3));
    }
  }

  const rawBandNames = [...bandNames];
  const recognizedBands = bandNames.map(b => b);

  const seasonMeta = COMPARATIVE_SEASONS_INFO.find(s => s.key === seasonKey) || COMPARATIVE_SEASONS_INFO[0];

  return {
    fileName: seasonMeta.fileName,
    width,
    height,
    bands,
    rawBandNames,
    recognizedBands,
    transform,
    metadata: {
      description: `Sentinel-2 SR Harmonized GEE Export - ${seasonMeta.name}`,
      capturePeriod: seasonMeta.period,
      lotName: `Huerto Avellanos Sector 30 (${seasonMeta.name})`,
      cropType: 'Avellano Europeo (Corylus avellana)',
    },
  };
}

export function createDefaultDataset(): GeoRasterData {
  return createDatasetForSeason('2025_2026');
}
