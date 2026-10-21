import React, { useState } from 'react';
import { X, Plus, Trash2, Check, RefreshCw } from 'lucide-react';

interface CustomFormulaModalProps {
  isOpen: boolean;
  userFormulas: Record<string, string>;
  onSaveFormulas: (formulas: Record<string, string>) => void;
  onClose: () => void;
}

export const CustomFormulaModal: React.FC<CustomFormulaModalProps> = ({
  isOpen,
  userFormulas,
  onSaveFormulas,
  onClose,
}) => {
  const [formulas, setFormulas] = useState<Record<string, string>>({
    ReCL: 'B8 / B5 - 1',
    NDWI: '(B3 - B8) / (B3 + B8)',
    S2_PRI: '(B3 - B5) / (B3 + B5)',
    ...userFormulas,
  });

  const [newKey, setNewKey] = useState<string>('');
  const [newExpr, setNewExpr] = useState<string>('');

  if (!isOpen) return null;

  const handleUpdate = (key: string, expr: string) => {
    setFormulas((prev) => ({ ...prev, [key]: expr }));
  };

  const handleDelete = (key: string) => {
    const copy = { ...formulas };
    delete copy[key];
    setFormulas(copy);
  };

  const handleAdd = () => {
    if (!newKey.trim() || !newExpr.trim()) return;
    setFormulas((prev) => ({ ...prev, [newKey.trim().toUpperCase()]: newExpr.trim() }));
    setNewKey('');
    setNewExpr('');
  };

  const handleSave = () => {
    onSaveFormulas(formulas);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Fórmulas de Usuario (FORMULAS_USUARIO)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Define o sobreescribe ecuaciones sobre bandas de reflectancia B2..B12
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
            Índices como <strong>ReCL</strong>, <strong>NDWI</strong> y <strong>S2_PRI</strong> poseen múltiples variantes en la literatura agronómica. Si una banda no está en el GeoTIFF, se calculará automáticamente evaluando estas fórmulas sobre las reflectancias de Sentinel-2 (0 a 1).
          </div>

          {/* List of current formulas */}
          <div className="space-y-2.5">
            {Object.entries(formulas).map(([key, expr]) => (
              <div
                key={key}
                className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700"
              >
                <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200 w-20 shrink-0">
                  {key}
                </span>
                <span className="text-slate-400 text-xs">=</span>
                <input
                  type="text"
                  value={expr}
                  onChange={(e) => handleUpdate(key, e.target.value)}
                  className="flex-1 text-xs font-mono px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={() => handleDelete(key)}
                  className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                  title="Eliminar fórmula"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Add custom formula */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block">
              Agregar Nueva Fórmula Personalizada
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nombre (ej. NDRE2)"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                className="w-28 text-xs font-mono px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
              />
              <input
                type="text"
                placeholder="Ecuación: (B8 - B6) / (B8 + B6)"
                value={newExpr}
                onChange={(e) => setNewExpr(e.target.value)}
                className="flex-1 text-xs font-mono px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={handleAdd}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 dark:bg-slate-200 dark:hover:bg-white text-white dark:text-slate-900 rounded text-xs font-medium flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Guardar y Aplicar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
