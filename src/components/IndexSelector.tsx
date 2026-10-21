import React from 'react';
import { INDICES_CATALOG } from '../utils/formulas';
import { IndexCategory } from '../types/geotiff';

interface IndexSelectorProps {
  selectedIndex: string;
  onSelectIndex: (id: string) => void;
  availableBands: Set<string>;
  sourceDescriptions: Record<string, string>;
}

const CATEGORIES: IndexCategory[] = [
  'Vigor',
  'Clorofila y nitrógeno',
  'Agua',
  'Fisiología',
  'Terreno',
];

export const IndexSelector: React.FC<IndexSelectorProps> = ({
  selectedIndex,
  onSelectIndex,
  availableBands,
  sourceDescriptions,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-3 px-4 sm:px-6 transition-colors">
      <div className="max-w-7xl mx-auto space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Índices y Capas de Análisis ({INDICES_CATALOG.length} disponibles)
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono hidden sm:inline">
            Selección instantánea · Cálculo dinámico multiespectral
          </span>
        </div>

        {/* Grouped Category Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {CATEGORIES.map((category) => {
            const indices = INDICES_CATALOG.filter((idx) => idx.category === category);

            return (
              <div
                key={category}
                className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-lg p-2 flex flex-col justify-between"
              >
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 px-1 truncate">
                  {category}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {indices.map((idx) => {
                    const isSelected = selectedIndex === idx.id;
                    const isAvailable = availableBands.has(idx.id);
                    const sourceDesc = sourceDescriptions[idx.id];
                    const isCalculated = sourceDesc && sourceDesc.startsWith('calculado');

                    return (
                      <button
                        key={idx.id}
                        onClick={() => onSelectIndex(idx.id)}
                        title={`${idx.name} - ${idx.description}\nFuente: ${sourceDesc || (isAvailable ? 'En archivo' : 'Requiere cálculo')}`}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500'
                        }`}
                      >
                        <span>{idx.id}</span>
                        {isCalculated && (
                          <span
                            className={`text-[9px] px-1 rounded font-mono ${
                              isSelected
                                ? 'bg-emerald-700 text-emerald-100'
                                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                            }`}
                            title="Calculado dinámicamente desde reflectancias B2..B11"
                          >
                            calc
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
