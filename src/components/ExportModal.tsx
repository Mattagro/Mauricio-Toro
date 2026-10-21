import React, { useState } from 'react';
import { X, Archive, FileText, Download, CheckCircle, FileSpreadsheet } from 'lucide-react';
import { GeoTransform, LayerStatistics } from '../types/geotiff';
import {
  exportLayerAsZip,
  exportLayerAsCsv,
  createGeoTiffBuffer,
  triggerFileDownload,
} from '../utils/geotiffWriter';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  layerId: string;
  fileName: string;
  data: Float32Array;
  width: number;
  height: number;
  transform: GeoTransform;
  statistics: LayerStatistics;
  sourceDescription: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  layerId,
  fileName,
  data,
  width,
  height,
  transform,
  statistics,
  sourceDescription,
}) => {
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportedStatus, setExportedStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExportZip = async () => {
    setIsExporting(true);
    setExportedStatus(null);
    try {
      await exportLayerAsZip(
        layerId,
        fileName,
        data,
        width,
        height,
        transform,
        statistics,
        sourceDescription
      );
      setExportedStatus('¡Archivo ZIP con GeoTIFF y estadísticas exportado con éxito!');
    } catch (err: any) {
      alert('Error al generar archivo ZIP: ' + (err?.message || err));
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportDirectTiff = () => {
    try {
      const buffer = createGeoTiffBuffer(
        data,
        width,
        height,
        transform,
        `${layerId} - ${fileName}`
      );
      const blob = new Blob([buffer], { type: 'image/tiff' });
      const cleanName = fileName.replace(/\.[^/.]+$/, '');
      triggerFileDownload(blob, `${layerId}_${cleanName}.tif`);
      setExportedStatus('¡GeoTIFF directo exportado con éxito!');
    } catch (err: any) {
      alert('Error al generar GeoTIFF: ' + (err?.message || err));
    }
  };

  const handleExportCsv = () => {
    try {
      exportLayerAsCsv(layerId, fileName, data, width, height, transform);
      setExportedStatus('¡Archivo CSV con coordenadas de píxeles exportado con éxito!');
    } catch (err: any) {
      alert('Error al generar CSV: ' + (err?.message || err));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Exportar Capa Seleccionada</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Capa activa: <strong className="text-slate-800 dark:text-slate-200">{layerId}</strong> ({statistics.areaHa.toFixed(1)} ha válidas)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Export Options */}
        <div className="p-6 space-y-3.5">
          {/* Option 1: ZIP with GeoTIFF (Platform standard) */}
          <div className="border border-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-950/20 rounded-xl p-4 flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Archive className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  GeoTIFF en paquete ZIP (Recomendado)
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 rounded font-semibold">
                  QGIS / ArcGIS
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Guarda el GeoTIFF de 1 banda float32 conservando georreferenciado WGS84, junto con la tabla de estadísticas zonales en CSV.
              </p>
            </div>
            <button
              onClick={handleExportZip}
              disabled={isExporting}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shrink-0 transition-colors shadow-xs cursor-pointer"
            >
              {isExporting ? 'Empaquetando...' : 'Descargar ZIP'}
            </button>
          </div>

          {/* Option 2: Direct .tif */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-start justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Archivo GeoTIFF Directo (.tif)
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Descarga directa del ráster monocanal Float32 con etiquetas GeoKeyDirectory y ModelTiepoint.
              </p>
            </div>
            <button
              onClick={handleExportDirectTiff}
              className="px-3.5 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold shrink-0 transition-colors cursor-pointer"
            >
              Descargar .TIF
            </button>
          </div>

          {/* Option 3: CSV Pixels */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-start justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Matriz de Píxeles en CSV
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Exporta cada píxel válido con fila, columna, latitud, longitud y valor exacto de {layerId}.
              </p>
            </div>
            <button
              onClick={handleExportCsv}
              className="px-3.5 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold shrink-0 transition-colors cursor-pointer"
            >
              Descargar CSV
            </button>
          </div>

          {exportedStatus && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-800 dark:text-emerald-300">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{exportedStatus}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
