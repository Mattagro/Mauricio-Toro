import React from 'react';
import { X, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { GeoRasterData } from '../types/geotiff';

interface BandTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  rasterData: GeoRasterData;
}

export const BandTableModal: React.FC<BandTableModalProps> = ({
  isOpen,
  onClose,
  rasterData,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Reconocimiento de Bandas en Archivo GeoTIFF
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {rasterData.fileName} · {rasterData.rawBandNames.length} bandas totales encontradas
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Table */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="mb-4 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800 leading-relaxed">
            El reconocedor normaliza el nombre de cada banda exportada desde GEE (removiendo fechas, prefijos o sufijos estadísticos como <code>20251001_NDVI</code> o <code>NDVI_mean</code>) y la asocia al catálogo multiespectral canónico de Sentinel-2.
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 font-semibold font-mono">
                  <th className="py-2.5 px-3 w-16">Banda #</th>
                  <th className="py-2.5 px-3">Nombre en Archivo</th>
                  <th className="py-2.5 px-3">Reconocida Como</th>
                  <th className="py-2.5 px-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                {rasterData.rawBandNames.map((name, i) => {
                  const recognized = rasterData.recognizedBands[i];
                  const bandNum = i + 1;

                  return (
                    <tr
                      key={i}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-2 px-3 text-slate-500 font-semibold">{bandNum}</td>
                      <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">
                        {name}
                      </td>
                      <td className="py-2 px-3">
                        {recognized ? (
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {recognized}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        {recognized ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Mapeada</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-500 text-[11px]">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Genérica</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg text-xs font-semibold hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
