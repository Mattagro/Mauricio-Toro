import React from 'react';
import { X, Check } from 'lucide-react';

interface CandidateBand {
  bandNumber: number; // 1-based
  name: string;
}

interface BandManualModalProps {
  isOpen: boolean;
  indexId: string;
  candidates: CandidateBand[];
  onSelectBand: (bandNumber: number) => void;
  onClose: () => void;
}

export const BandManualModal: React.FC<BandManualModalProps> = ({
  isOpen,
  indexId,
  candidates,
  onSelectBand,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Seleccionar BANDA_MANUAL ({indexId})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Se detectaron múltiples capas asociadas a '{indexId}' en el GeoTIFF
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Candidate List */}
        <div className="p-6 space-y-3">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            En series multitemporales o estadísticas compuestas, un mismo índice puede aparecer repetido en distintas fechas. Selecciona el número de banda que deseas visualizar:
          </p>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {candidates.map((c) => (
              <button
                key={c.bandNumber}
                onClick={() => {
                  onSelectBand(c.bandNumber);
                  onClose();
                }}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 transition-all text-left group"
              >
                <div>
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
                    Banda {c.bandNumber}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    {c.name}
                  </span>
                </div>
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform">
                  Usar &rarr;
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
