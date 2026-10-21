import React from 'react';
import { Layers, Download, Upload, Moon, Sun, TableProperties, Sliders } from 'lucide-react';

interface HeaderProps {
  fileName: string;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onOpenUpload: () => void;
  onOpenBandTable: () => void;
  onOpenFormulas: () => void;
  onOpenExport: () => void;
  onOpenGEE: () => void;
  bandCount: number;
  currentView: 'single' | 'comparative' | 'gee_canvas';
  onChangeView: (view: 'single' | 'comparative' | 'gee_canvas') => void;
  geeConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  fileName,
  isDarkMode,
  onToggleTheme,
  onOpenUpload,
  onOpenBandTable,
  onOpenFormulas,
  onOpenExport,
  onOpenGEE,
  bandCount,
  currentView,
  onChangeView,
  geeConnected,
}) => {
  return (
    <header className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-15 flex items-center justify-between gap-4">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm">
            <Layers className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap">
              AgroVision
            </span>
            <span className="hidden sm:inline text-xs text-slate-500 dark:text-slate-400 font-mono">
              Sentinel-2 GEE
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation & Dataset Actions */}
        <nav className="flex items-center gap-2 sm:gap-3 text-xs font-medium text-slate-600 dark:text-slate-300 overflow-x-auto py-1">
          {/* View Mode Switcher */}
          <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button
              onClick={() => onChangeView('single')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                currentView === 'single'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Visor de Capas
            </button>
            <button
              onClick={() => onChangeView('comparative')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                currentView === 'comparative'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span>Comparativa Temporal</span>
            </button>
            <button
              onClick={() => onChangeView('gee_canvas')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                currentView === 'gee_canvas'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Abrir lienzo de mapa satelital como en Google Earth Engine con inspector de firma espectral"
            >
              <span>Lienzo GEE en Vivo</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            </button>
          </div>

          {/* GEE Code & Config API Button */}
          <button
            onClick={onOpenGEE}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            title="Ver código y configuración de la API de Google Earth Engine en JavaScript"
          >
            <span className={`w-2 h-2 rounded-full ${geeConnected ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
            <span className="font-mono text-[11px]">Config GEE</span>
          </button>

          <button
            onClick={onOpenBandTable}
            className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            title="Ver catálogo y estado de bandas reconocidas"
          >
            <TableProperties className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>Bandas ({bandCount})</span>
          </button>

          <button
            onClick={onOpenFormulas}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            title="Configurar fórmulas personalizadas (FORMULAS_USUARIO)"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>Fórmulas</span>
          </button>

          <button
            onClick={onOpenUpload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors whitespace-nowrap shrink-0"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cargar GeoTIFF</span>
            <span className="sm:hidden">Subir</span>
          </button>

          <button
            onClick={onToggleTheme}
            className="p-1.5 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            title={isDarkMode ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            aria-label="Alternar tema claro/oscuro"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </nav>

        {/* Zone 3: Primary Action (Exportar) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenExport}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exportar Capa</span>
            <span className="sm:hidden">Exportar</span>
          </button>
        </div>
      </div>
    </header>
  );
};
