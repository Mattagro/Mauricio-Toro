import React, { useState } from 'react';
import { LayerStatistics } from '../types/geotiff';
import { computeHistogram, HistogramBin } from '../utils/statistics';
import { getInterpolatedColor } from '../utils/colormaps';

interface HistogramChartProps {
  data: Float32Array;
  stats: LayerStatistics;
  layerId: string;
  colormapName: string;
  unit?: string;
}

export const HistogramChart: React.FC<HistogramChartProps> = ({
  data,
  stats,
  layerId,
  colormapName,
  unit,
}) => {
  const [hoveredBin, setHoveredBin] = useState<HistogramBin | null>(null);

  // Compute 42 bins between P2 and P98 or min and max
  const bins = computeHistogram(data, 42, stats.p2, stats.p98);
  const maxCount = Math.max(...bins.map((b) => b.count), 1);

  const vmin = stats.p2;
  const vmax = stats.p98;
  const range = vmax - vmin || 1;

  // SVG Chart dimensions
  const chartHeight = 160;
  const chartWidth = 560;
  const paddingBottom = 26;
  const paddingTop = 14;
  const usableHeight = chartHeight - paddingBottom - paddingTop;

  // Helper to map value to SVG X coordinate
  const valToX = (v: number) => {
    const t = Math.max(0, Math.min(1, (v - vmin) / range));
    return t * chartWidth;
  };

  const meanX = valToX(stats.mean);
  const medianX = valToX(stats.median);
  const p5X = valToX(stats.p5);
  const p95X = valToX(stats.p95);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-3 transition-colors">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2">
        <div>
          <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
            Distribución de Frecuencias
          </span>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Histograma del Dosel · {layerId}
          </h3>
        </div>

        {/* Dynamic Hover Tooltip Badge */}
        {hoveredBin ? (
          <div className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-700 dark:text-slate-300">
            [{hoveredBin.x0.toFixed(3)} – {hoveredBin.x1.toFixed(3)}]:{' '}
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {hoveredBin.count.toLocaleString('es-CL')} px
            </span>{' '}
            ({hoveredBin.percent.toFixed(1)}%)
          </div>
        ) : (
          <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
            Pasa el cursor sobre las barras para ver detalles
          </span>
        )}
      </div>

      {/* SVG Histogram */}
      <div className="w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-44 overflow-visible"
        >
          {/* Subtle Gridlines */}
          <line
            x1="0"
            y1={paddingTop + usableHeight * 0.5}
            x2={chartWidth}
            y2={paddingTop + usableHeight * 0.5}
            stroke="currentColor"
            strokeDasharray="3 3"
            className="text-slate-200 dark:text-slate-800"
          />
          <line
            x1="0"
            y1={paddingTop + usableHeight}
            x2={chartWidth}
            y2={paddingTop + usableHeight}
            stroke="currentColor"
            className="text-slate-300 dark:text-slate-700"
          />

          {/* Histogram Bins */}
          {bins.map((bin, i) => {
            const barW = Math.max(1, chartWidth / bins.length - 1);
            const barX = i * (chartWidth / bins.length);
            const barH = (bin.count / maxCount) * usableHeight;
            const barY = paddingTop + usableHeight - barH;

            // Compute color from colormap
            const normVal = Math.max(0, Math.min(1, (bin.midpoint - vmin) / range));
            const [r, g, b] = getInterpolatedColor(normVal, colormapName);
            const fillColor = `rgb(${r}, ${g}, ${b})`;

            return (
              <rect
                key={i}
                x={barX}
                y={barY}
                width={barW}
                height={Math.max(1.5, barH)}
                fill={fillColor}
                opacity={hoveredBin === bin ? 1 : 0.85}
                rx={1}
                className="cursor-pointer transition-opacity"
                onMouseEnter={() => setHoveredBin(bin)}
                onMouseLeave={() => setHoveredBin(null)}
              />
            );
          })}

          {/* Markers: P5, Median, Mean, P95 */}
          {/* P5 Marker */}
          <line
            x1={p5X}
            y1={paddingTop}
            x2={p5X}
            y2={paddingTop + usableHeight}
            stroke="#94a3b8"
            strokeWidth="1.2"
            strokeDasharray="2 2"
          />

          {/* P95 Marker */}
          <line
            x1={p95X}
            y1={paddingTop}
            x2={p95X}
            y2={paddingTop + usableHeight}
            stroke="#94a3b8"
            strokeWidth="1.2"
            strokeDasharray="2 2"
          />

          {/* Mean Marker */}
          <line
            x1={meanX}
            y1={paddingTop - 6}
            x2={meanX}
            y2={paddingTop + usableHeight}
            stroke="#10b981"
            strokeWidth="2"
          />

          {/* Median Marker */}
          <line
            x1={medianX}
            y1={paddingTop - 6}
            x2={medianX}
            y2={paddingTop + usableHeight}
            stroke="#f59e0b"
            strokeWidth="2"
            strokeDasharray="3 2"
          />

          {/* X Axis Labels */}
          <text
            x="0"
            y={chartHeight - 4}
            className="fill-slate-500 font-mono text-[10px]"
            textAnchor="start"
          >
            {vmin.toFixed(2)}
          </text>
          <text
            x={chartWidth / 2}
            y={chartHeight - 4}
            className="fill-slate-500 font-mono text-[10px]"
            textAnchor="middle"
          >
            {stats.median.toFixed(2)}
          </text>
          <text
            x={chartWidth}
            y={chartHeight - 4}
            className="fill-slate-500 font-mono text-[10px]"
            textAnchor="end"
          >
            {vmax.toFixed(2)}
          </text>
        </svg>
      </div>

      {/* Legend for Markers */}
      <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-emerald-500 inline-block"></span>
            <span>Media: {stats.mean.toFixed(3)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-amber-500 inline-block border-b border-dashed"></span>
            <span>Mediana: {stats.median.toFixed(3)}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-slate-500">
          <span>P5: {stats.p5.toFixed(3)}</span>
          <span>P95: {stats.p95.toFixed(3)}</span>
        </div>
      </div>
    </div>
  );
};
