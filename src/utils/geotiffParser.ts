import { fromArrayBuffer } from 'geotiff';
import { GeoRasterData, GeoTransform } from '../types/geotiff';
import { recognizeBandName } from './formulas';

export interface ParseResult {
  data?: GeoRasterData;
  needsBandOrder?: {
    bandCount: number;
    rawArrayBuffer: ArrayBuffer;
    width: number;
    height: number;
    transform: GeoTransform;
    rasters: any;
  };
  error?: string;
}

/**
 * Extracts band names from GeoTIFF metadata tags or GDAL_METADATA XML.
 */
function extractBandNames(fileDirectory: any, count: number): (string | null)[] {
  const names: (string | null)[] = new Array(count).fill(null);

  // 1. Check GDAL_METADATA xml
  if (fileDirectory.GDAL_METADATA) {
    try {
      const xmlStr = String(fileDirectory.GDAL_METADATA);
      const bandMatches = xmlStr.matchAll(/<Item name="DESCRIPTION"[^>]*>([^<]+)<\/Item>/g);
      let idx = 0;
      for (const m of bandMatches) {
        if (idx < count) {
          names[idx] = m[1].trim();
          idx++;
        }
      }
    } catch {
      // ignore xml parse issues
    }
  }

  // 2. Check ImageDescription (often JSON or comma separated or key-value)
  if (!names.some(n => n !== null) && fileDirectory.ImageDescription) {
    try {
      const desc = String(fileDirectory.ImageDescription);
      if (desc.startsWith('{') && desc.endsWith('}')) {
        const parsed = JSON.parse(desc);
        if (Array.isArray(parsed.bands)) {
          parsed.bands.forEach((b: string, i: number) => {
            if (i < count) names[i] = b;
          });
        }
      } else if (desc.includes(',')) {
        const parts = desc.split(',').map(s => s.trim());
        if (parts.length === count) {
          parts.forEach((p, i) => (names[i] = p));
        }
      }
    } catch {
      // ignore
    }
  }

  return names;
}

/**
 * Parses an uploaded GeoTIFF file.
 */
export async function parseGeoTiffFile(
  file: File,
  forcedBandOrder?: string[]
): Promise<ParseResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const tiff = await fromArrayBuffer(arrayBuffer);
    const image = await tiff.getImage();

    const width = image.getWidth();
    const height = image.getHeight();
    const bandCount = image.getSamplesPerPixel();

    // Georeferencing
    const origin = image.getOrigin() || [0, 0, 0];
    const resolution = image.getResolution() || [0.0001, 0.0001, 0];

    const west = origin[0] || -71.65;
    const north = origin[1] || -35.42;
    const pixelWidth = Math.abs(resolution[0] || 0.000089);
    const pixelHeight = Math.abs(resolution[1] || 0.000089);

    // Approximate meters at this latitude
    const latRad = (north * Math.PI) / 180;
    const pixelWidthMeters = pixelWidth * 111320 * Math.cos(latRad);
    const pixelHeightMeters = pixelHeight * 110940;

    const transform: GeoTransform = {
      west,
      north,
      pixelWidth,
      pixelHeight,
      pixelWidthMeters: Math.max(1, pixelWidthMeters),
      pixelHeightMeters: Math.max(1, pixelHeightMeters),
      crs: 'EPSG:4326 / Projected',
    };

    const rasters = await image.readRasters({ interleave: false });

    // Determine band names
    let bandNames: (string | null)[] = [];
    if (forcedBandOrder && forcedBandOrder.length === bandCount) {
      bandNames = [...forcedBandOrder];
    } else {
      bandNames = extractBandNames(image.fileDirectory, bandCount);
    }

    const hasAnyName = bandNames.some(n => n !== null && n.trim() !== '');
    if (!hasAnyName && !forcedBandOrder) {
      return {
        needsBandOrder: {
          bandCount,
          rawArrayBuffer: arrayBuffer,
          width,
          height,
          transform,
          rasters,
        },
      };
    }

    // Populate bands map
    const bands = new Map<string, Float32Array>();
    const rawNames: string[] = [];
    const recognized: (string | null)[] = [];

    for (let i = 0; i < bandCount; i++) {
      const originalName = bandNames[i] || `Banda_${i + 1}`;
      rawNames.push(originalName);

      const canonical = recognizeBandName(originalName);
      recognized.push(canonical);

      const rasterArray = rasters[i];
      const floatArray = new Float32Array(width * height);
      for (let j = 0; j < rasterArray.length; j++) {
        const v = rasterArray[j];
        // Handle standard NoData or infinite
        floatArray[j] = isNaN(v) || v <= -9999 ? NaN : v;
      }

      if (canonical) {
        bands.set(canonical, floatArray);
      }
      bands.set(originalName, floatArray);
    }

    const data: GeoRasterData = {
      fileName: file.name,
      width,
      height,
      bands,
      rawBandNames: rawNames,
      recognizedBands: recognized,
      transform,
      metadata: {
        description: `GeoTIFF cargado (${bandCount} bandas)`,
        lotName: file.name.replace(/\.[^/.]+$/, ''),
      },
    };

    return { data };
  } catch (err: any) {
    return { error: err?.message || 'Error al procesar el archivo GeoTIFF.' };
  }
}
