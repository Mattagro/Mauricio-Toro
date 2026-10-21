import React from 'react';
import { LayerStatistics, GeoTransform } from '../types/geotiff';
import { Activity, MapPin, Gauge, Percent } from 'lucide-react';

interface StatisticsPanelProps {
  stats: LayerStatistics;
  layerId: string;
  unit?: string;
  transform: GeoTransform;
  sourceDescription: string;
}

export const StatisticsPanel: React.FC<StatisticsPanelProps> = ({
  stats,
  layerId,
  unit,
  transform,
  sourceDescription,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-5 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
            Estadísticas Zonales del Lote
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>{layerId}</span>
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400 font-mono">
              {unit || ''}
            </span>
          </h2>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">Origen</div>
          <div className="text-xs font-mono font-medium text-emerald-600 dark:text-emerald-400 max-w-[200px] truncate" title={sourceDescription}>
            {sourceDescription}
          </div>
        </div>
      </div>

      {/* Primary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Media del Lote */}
        <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 rounded-lg p-3">
          <div className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
            Media del Lote
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-900 dark:text-emerald-200 mt-1">
            {stats.mean.toFixed(4)}
          </div>
          <div className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
            ± {stats.stdDev.toFixed(4)} desv. est.
          </div>
        </div>

        {/* Mediana (P50) */}
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-lg p-3">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Mediana (P50)
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            {stats.median.toFixed(4)}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
            Valor central del dosel
          </div>
        </div>

        {/* Superficie Real del Lote */}
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-lg p-3">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Superficie del Lote
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            {stats.areaHa.toFixed(1)} <span className="text-xs font-normal text-slate-500">ha</span>
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
            {stats.areaM2.toLocaleString('es-CL')} m²
          </div>
        </div>

        {/* Píxeles con Dato */}
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-lg p-3">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Píxeles con Dato
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            {stats.validCount.toLocaleString('es-CL')}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
            {stats.validPercent.toFixed(1)}% del cuadro raster
          </div>
        </div>
      </div>

      {/* Percentiles & Range Table */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
        <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
          Distribución de Percentiles y Rangos Críticos
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-6 divide-x divide-y sm:divide-y-0 divide-slate-200 dark:divide-slate-800 text-center text-xs">
          <div className="p-2.5">
            <span className="text-[10px] text-slate-500 block uppercase font-mono">Mínimo</span>
            <span className="font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200">
              {stats.min.toFixed(4)}
            </span>
          </div>
          <div className="p-2.5">
            <span className="text-[10px] text-slate-500 block uppercase font-mono">P5 (Bajo)</span>
            <span className="font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200">
              {stats.p5.toFixed(4)}
            </span>
          </div>
          <div className="p-2.5">
            <span className="text-[10px] text-slate-500 block uppercase font-mono">P25 (Q1)</span>
            <span className="font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200">
              {stats.p25.toFixed(4)}
            </span>
          </div>
          <div className="p-2.5">
            <span className="text-[10px] text-slate-500 block uppercase font-mono">P75 (Q3)</span>
            <span className="font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200">
              {stats.p75.toFixed(4)}
            </span>
          </div>
          <div className="p-2.5">
            <span className="text-[10px] text-slate-500 block uppercase font-mono">P95 (Alto)</span>
            <span className="font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200">
              {stats.p95.toFixed(4)}
            </span>
          </div>
          <div className="p-2.5">
            <span className="text-[10px] text-slate-500 block uppercase font-mono">Máximo</span>
            <span className="font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200">
              {stats.max.toFixed(4)}
            </span>
          </div>
        </div>
      </div>

      {/* Spatial Geometry Footnote */}
      <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono pt-1">
        <div>
          Tamaño de píxel a latitud actual: ≈ {transform.pixelWidthMeters.toFixed(1)} × {transform.pixelHeightMeters.toFixed(1)} m
        </div>
        <div>
          CRS: {transform.crs}
        </div>
      </div>
    </div>
  );
};
