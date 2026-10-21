import JSZip from 'jszip';
import { GeoTransform, LayerStatistics } from '../types/geotiff';

/**
 * Creates a valid Little-Endian Single-Band Float32 GeoTIFF ArrayBuffer.
 * Preserves exact georeferencing (ModelTiepoint, ModelPixelScale, GeoKeyDirectory).
 */
export function createGeoTiffBuffer(
  data: Float32Array,
  width: number,
  height: number,
  transform: GeoTransform,
  description: string = 'Sentinel-2 Layer'
): ArrayBuffer {
  // Little-endian TIFF
  const pixelCount = width * height;
  const rawDataBytes = pixelCount * 4; // Float32

  // Align raw data offset to 16 bytes
  const headerSize = 8;
  const dataOffset = 16;
  const ifdOffset = dataOffset + rawDataBytes;

  // Let's count tags:
  // 1: ImageWidth (SHORT)
  // 2: ImageLength (SHORT)
  // 3: BitsPerSample (SHORT = 32)
  // 4: Compression (SHORT = 1)
  // 5: PhotometricInterpretation (SHORT = 1)
  // 6: StripOffsets (LONG)
  // 7: SamplesPerPixel (SHORT = 1)
  // 8: RowsPerStrip (LONG/SHORT = height)
  // 9: StripByteCounts (LONG = rawDataBytes)
  // 10: SampleFormat (SHORT = 3 -> Float)
  // 11: ModelPixelScaleTag (DOUBLE x 3: scaleX, scaleY, 0) -> Tag 33550
  // 12: ModelTiepointTag (DOUBLE x 6: 0, 0, 0, west, north, 0) -> Tag 33922
  // 13: GeoKeyDirectoryTag (SHORT x 16) -> Tag 34735
  const numTags = 13;
  const ifdSize = 2 + numTags * 12 + 4; // count + entries + nextIFD offset

  // Trailing payload for multi-value tags (ModelPixelScale, ModelTiepoint, GeoKeyDirectory)
  const pixelScaleBytes = 3 * 8; // 24 bytes
  const tiepointBytes = 6 * 8;   // 48 bytes
  const geoKeyBytes = 16 * 2;    // 32 bytes
  const extraPayloadSize = pixelScaleBytes + tiepointBytes + geoKeyBytes;

  const totalSize = ifdOffset + ifdSize + extraPayloadSize;
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  const floatView = new Float32Array(buffer, dataOffset, pixelCount);

  // 1. TIFF Header: 'II' (0x4949) + 42 + offset to first IFD
  view.setUint8(0, 0x49); // 'I'
  view.setUint8(1, 0x49); // 'I'
  view.setUint16(2, 42, true);
  view.setUint32(4, ifdOffset, true);

  // 2. Write Float32 Raster Data (replacing NaN with standard IEEE NaN)
  for (let i = 0; i < pixelCount; i++) {
    floatView[i] = data[i];
  }

  // 3. Write Extra Payload
  let payloadOffset = ifdOffset + ifdSize;

  const pixelScaleOffset = payloadOffset;
  view.setFloat64(pixelScaleOffset, transform.pixelWidth, true);
  view.setFloat64(pixelScaleOffset + 8, transform.pixelHeight, true);
  view.setFloat64(pixelScaleOffset + 16, 0.0, true);
  payloadOffset += pixelScaleBytes;

  const tiepointOffset = payloadOffset;
  view.setFloat64(tiepointOffset, 0.0, true); // I
  view.setFloat64(tiepointOffset + 8, 0.0, true); // J
  view.setFloat64(tiepointOffset + 16, 0.0, true); // K
  view.setFloat64(tiepointOffset + 24, transform.west, true); // X (Longitude)
  view.setFloat64(tiepointOffset + 32, transform.north, true); // Y (Latitude)
  view.setFloat64(tiepointOffset + 40, 0.0, true); // Z
  payloadOffset += tiepointBytes;

  const geoKeyOffset = payloadOffset;
  // Standard GeoKey directory: KeyDirectoryVersion=1, KeyRevision=1, MinorRevision=0, NumberOfKeys=3
  // Key 1: GTModelTypeGeoKey (1024) = ModelTypeGeographic (2)
  // Key 2: GTRasterTypeGeoKey (1025) = RasterPixelIsArea (1)
  // Key 3: GeographicTypeGeoKey (2048) = GCS_WGS_84 (4326)
  const geoKeys = [
    1, 1, 0, 3, // Header
    1024, 0, 1, 2, // GTModelTypeGeoKey = 2 (Geographic wgs84)
    1025, 0, 1, 1, // GTRasterTypeGeoKey = 1 (PixelIsArea)
    2048, 0, 1, 4326 // GeographicTypeGeoKey = 4326 (WGS84)
  ];
  for (let k = 0; k < geoKeys.length; k++) {
    view.setUint16(geoKeyOffset + k * 2, geoKeys[k], true);
  }

  // 4. Write IFD Entries
  let entryPos = ifdOffset;
  view.setUint16(entryPos, numTags, true);
  entryPos += 2;

  const writeTag = (tag: number, type: number, count: number, valueOrOffset: number) => {
    view.setUint16(entryPos, tag, true);
    view.setUint16(entryPos + 2, type, true);
    view.setUint32(entryPos + 4, count, true);
    view.setUint32(entryPos + 8, valueOrOffset, true);
    entryPos += 12;
  };

  // Types: 3 = SHORT (2 bytes), 4 = LONG (4 bytes), 12 = DOUBLE (8 bytes)
  writeTag(256, 4, 1, width); // ImageWidth
  writeTag(257, 4, 1, height); // ImageLength
  writeTag(258, 3, 1, 32); // BitsPerSample
  writeTag(259, 3, 1, 1); // Compression (none)
  writeTag(262, 3, 1, 1); // PhotometricInterpretation (BlackIsZero)
  writeTag(273, 4, 1, dataOffset); // StripOffsets
  writeTag(277, 3, 1, 1); // SamplesPerPixel
  writeTag(278, 4, 1, height); // RowsPerStrip
  writeTag(279, 4, 1, rawDataBytes); // StripByteCounts
  writeTag(339, 3, 1, 3); // SampleFormat = 3 (IEEE Floating point)
  writeTag(33550, 12, 3, pixelScaleOffset); // ModelPixelScaleTag
  writeTag(33922, 12, 6, tiepointOffset); // ModelTiepointTag
  writeTag(34735, 3, 16, geoKeyOffset); // GeoKeyDirectoryTag

  // Next IFD offset = 0
  view.setUint32(entryPos, 0, true);

  return buffer;
}

/**
 * Downloads a binary blob as a file in the browser.
 */
export function triggerFileDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Exports single-band GeoTIFF enclosed within a .ZIP file (along with metadata and statistics CSV).
 */
export async function exportLayerAsZip(
  layerId: string,
  baseFileName: string,
  data: Float32Array,
  width: number,
  height: number,
  transform: GeoTransform,
  stats: LayerStatistics,
  sourceInfo: string
) {
  const zip = new JSZip();

  // 1. GeoTIFF file
  const tifBuffer = createGeoTiffBuffer(data, width, height, transform, `${layerId} - ${baseFileName}`);
  const baseCleanName = baseFileName.replace(/\.[^/.]+$/, '');
  const tifFileName = `${layerId}_${baseCleanName}.tif`;
  zip.file(tifFileName, tifBuffer);

  // 2. Statistics CSV
  const csvContent = [
    'Propiedad,Valor,Unidad',
    `Capa / Indice,${layerId},-`,
    `Archivo Origen,${baseFileName},-`,
    `Fuente,${sourceInfo},-`,
    `Superficie Valida,${stats.areaHa.toFixed(2)},hectareas (ha)`,
    `Superficie Valida M2,${stats.areaM2.toFixed(0)},m2`,
    `Pixeles Totales,${stats.count},pixeles`,
    `Pixeles con Dato,${stats.validCount},pixeles`,
    `Pixeles con Dato (%),${stats.validPercent.toFixed(2)},%`,
    `Tamano Pixel Real,${transform.pixelWidthMeters.toFixed(1)} x ${transform.pixelHeightMeters.toFixed(1)},metros`,
    `Media,${stats.mean.toFixed(4)},-`,
    `Mediana (P50),${stats.median.toFixed(4)},-`,
    `Desviacion Estandar,${stats.stdDev.toFixed(4)},-`,
    `Minimo,${stats.min.toFixed(4)},-`,
    `Percentil 2 (P2),${stats.p2.toFixed(4)},-`,
    `Percentil 5 (P5),${stats.p5.toFixed(4)},-`,
    `Percentil 25 (P25),${stats.p25.toFixed(4)},-`,
    `Percentil 75 (P75),${stats.p75.toFixed(4)},-`,
    `Percentil 95 (P95),${stats.p95.toFixed(4)},-`,
    `Percentil 98 (P98),${stats.p98.toFixed(4)},-`,
    `Maximo,${stats.max.toFixed(4)},-`,
    `CRS,${transform.crs},-`,
    `Coordenada Noroeste,${transform.north.toFixed(6)} S / ${transform.west.toFixed(6)} W,grados decimales`,
  ].join('\n');

  zip.file(`${layerId}_estadisticas.csv`, csvContent);

  // 3. Readme / Metadata text
  const readme = [
    `# Exportación GeoTIFF: ${layerId}`,
    `Archivo: ${tifFileName}`,
    `Generado por AgroVision Web GIS Workstation.`,
    `Conserva georreferenciación WGS84 / UTM para apertura directa en QGIS o ArcGIS.`,
    `Fecha de exportación: ${new Date().toISOString()}`,
    `Fuente de cálculo: ${sourceInfo}`,
  ].join('\n');
  zip.file('LEAME_GEOREFERENCIADO.txt', readme);

  const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  triggerFileDownload(zipBlob, `${layerId}_${baseCleanName}_GeoTIFF.zip`);
}

/**
 * Exports data as CSV with coordinates.
 */
export function exportLayerAsCsv(
  layerId: string,
  baseFileName: string,
  data: Float32Array,
  width: number,
  height: number,
  transform: GeoTransform
) {
  const rows: string[] = ['columna,fila,longitud,latitud,valor'];
  for (let y = 0; y < height; y++) {
    const lat = transform.north - y * transform.pixelHeight;
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const val = data[idx];
      if (!isNaN(val)) {
        const lon = transform.west + x * transform.pixelWidth;
        rows.push(`${x},${y},${lon.toFixed(6)},${lat.toFixed(6)},${val.toFixed(4)}`);
      }
    }
  }

  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const baseCleanName = baseFileName.replace(/\.[^/.]+$/, '');
  triggerFileDownload(blob, `${layerId}_${baseCleanName}_pixeles.csv`);
}
