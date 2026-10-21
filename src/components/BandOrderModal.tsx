import React, { useState } from 'react';
import { X, HelpCircle, Check } from 'lucide-react';

interface BandOrderModalProps {
  isOpen: boolean;
  bandCount: number;
  fileName: string;
  onConfirm: (bandOrder: string[]) => void;
  onCancel: () => void;
}

export const BandOrderModal: React.FC<BandOrderModalProps> = ({
  isOpen,
  bandCount,
  fileName,
  onConfirm,
  onCancel,
}) => {
  const [bandText, setBandText] = useState<string>(() => {
    // Default preset recommendation
    if (bandCount === 29) {
      return 'B1, B2, B3, B4, B5, B6, B7, B8, B8A, B9, B11, B12, DEM, Slope, NDVI, GNDVI, EVI, SAVI, OSAVI, NDRE, GCL, ReCL, ARVI, MSAVI2, S2_PRI, NDMI, NDWI, Kcb, N_Indicator';
    }
    if (bandCount === 8) {
      return 'B2, B3, B4, B5, B8, B11, NDVI, DEM';
    }
    if (bandCount === 6) {
      return 'B2, B3, B4, B5, B8, B11';
    }
    return Array.from({ length: bandCount }, (_, i) => `Banda_${i + 1}`).join(', ');
  });

  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApply = () => {
    const list = bandText
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (list.length !== bandCount) {
      setError(
        `Se esperaban ${bandCount} nombres para las ${bandCount} bandas del archivo, pero ingresaste ${list.length}.`
      );
      return;
    }

    setError(null);
    onConfirm(list);
  };

  const applyPreset = (preset: string[]) => {
    setBandText(preset.join(', '));
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Definir ORDEN_BANDAS
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              El archivo {fileName} no contiene metadatos de nombres para sus {bandCount} bandas.
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Google Earth Engine a veces omite las etiquetas de banda al exportar. Ingresa los nombres en el orden exacto en que seleccionaste las bandas al exportar tu Image / ImageCollection:
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Lista ordenada separada por comas ({bandCount} bandas):
            </label>
            <textarea
              rows={4}
              value={bandText}
              onChange={(e) => {
                setBandText(e.target.value);
                setError(null);
              }}
              className="w-full text-xs font-mono p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              placeholder="B2, B3, B4, B5, B8, B11, NDVI, DEM..."
            />
          </div>

          {/* Quick Presets */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Plantillas Rápidas:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() =>
                  applyPreset([
                    'B2', 'B3', 'B4', 'B5', 'B8', 'B11', 'NDVI', 'DEM'
                  ].slice(0, bandCount))
                }
                className="text-[11px] px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                S2 Base + NDVI + DEM
              </button>
              <button
                type="button"
                onClick={() =>
                  applyPreset([
                    'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B8A', 'B9', 'B11', 'B12',
                    'DEM', 'Slope', 'NDVI', 'GNDVI', 'EVI', 'SAVI', 'OSAVI', 'NDRE', 'GCL', 'ReCL',
                    'ARVI', 'MSAVI2', 'S2_PRI', 'NDMI', 'NDWI', 'Kcb', 'N_Indicator'
                  ].slice(0, bandCount))
                }
                className="text-[11px] px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                29 Bandas Sentinel-2 Completas
              </button>
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded-md bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-300">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleApply}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Aplicar Nombres</span>
          </button>
        </div>
      </div>
    </div>
  );
};
