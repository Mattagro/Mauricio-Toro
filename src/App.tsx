// ==============================================================================
// GOOGLE EARTH ENGINE (GEE) API — INICIALIZACIÓN EN JAVASCRIPT
// Traducido desde la API nativa de Python:
//   import ee
//   ee.Authenticate()
//   ee.Initialize(project='tu-proyecto-gee')
// A la implementación estándar de JavaScript:
// ==============================================================================
/**
 * Inicialización de Earth Engine API en entorno JavaScript / Web:
 *
 * import * as ee from '@google/earthengine';
 *
 * const GEE_PROJECT_ID = 'ee-agrovision-sentinel2';
 * const OAUTH_CLIENT_ID = 'TU_OAUTH_CLIENT_ID.apps.googleusercontent.com';
 *
 * export function inicializarEarthEngineJS(callback?: () => void) {
 *   ee.data.authenticateViaOAuth(
 *     OAUTH_CLIENT_ID,
 *     () => {
 *       ee.initialize(
 *         null,
 *         () => {
 *           console.log('GEE API inicializada con éxito en JS. Proyecto:', GEE_PROJECT_ID);
 *           if (callback) callback();
 *         },
 *         (err: any) => console.error('Error al inicializar GEE:', err),
 *         null,
 *         GEE_PROJECT_ID
 *       );
 *     },
 *     (authErr: any) => console.error('Error en autenticación OAuth2 GEE:', authErr),
 *     ['https://www.googleapis.com/auth/earthengine']
 *   );
 * }
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createDefaultDataset } from './utils/defaultDataset';
import { INDICES_CATALOG, calculateIndexFromBands, BASE_FORMULAS } from './utils/formulas';
import { computeLayerStatistics } from './utils/statistics';
import { parseGeoTiffFile } from './utils/geotiffParser';
import { GeoRasterData, ColorStretchMode } from './types/geotiff';
import { DEFAULT_GEE_CONFIG, GEEConfig } from './utils/geeApi';

import { Header } from './components/Header';
import { IndexSelector } from './components/IndexSelector';
import { RasterMap } from './components/RasterMap';
import { StatisticsPanel } from './components/StatisticsPanel';
import { HistogramChart } from './components/HistogramChart';
import { ComparativeAnalysisView } from './components/ComparativeAnalysisView';
import { GEEInteractiveCanvas } from './components/GEEInteractiveCanvas';
import { BandTableModal } from './components/BandTableModal';
import { BandOrderModal } from './components/BandOrderModal';
import { BandManualModal } from './components/BandManualModal';
import { CustomFormulaModal } from './components/CustomFormulaModal';
import { ExportModal } from './components/ExportModal';
import { UploadModal } from './components/UploadModal';
import { GEEApiModal } from './components/GEEApiModal';

export default function App() {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // View state: 'single' (Visor de Capas) vs 'comparative' (Comparativa Temporal) vs 'gee_canvas' (Lienzo GEE en Vivo)
  const [currentView, setCurrentView] = useState<'single' | 'comparative' | 'gee_canvas'>('single');

  // GEE API Configuration state
  const [geeConfig, setGeeConfig] = useState<GEEConfig>(DEFAULT_GEE_CONFIG);
  const [isGEEOpen, setIsGEEOpen] = useState<boolean>(false);

  // Active GeoTIFF Dataset (default: AvellsFlor_nov25ene26.tif)
  const [rasterData, setRasterData] = useState<GeoRasterData>(() => createDefaultDataset());

  // Active selected index (default: NDVI)
  const [selectedIndex, setSelectedIndex] = useState<string>('NDVI');

  // Color stretch mode (P2-P98 robust vs Min-Max)
  const [stretchMode, setStretchMode] = useState<ColorStretchMode>('p2_p98');

  // User custom formulas: FORMULAS_USUARIO
  const [userFormulas, setUserFormulas] = useState<Record<string, string>>({
    ReCL: 'B8 / B5 - 1',
    NDWI: '(B3 - B8) / (B3 + B8)',
    S2_PRI: '(B3 - B5) / (B3 + B5)',
  });

  // Manual band overrides: BANDA_MANUAL
  const [manualBandOverrides, setManualBandOverrides] = useState<Record<string, number>>({});

  // Modals state
  const [isBandTableOpen, setIsBandTableOpen] = useState<boolean>(false);
  const [isFormulasOpen, setIsFormulasOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);

  // Pending file for ORDEN_BANDAS prompt
  const [pendingBandOrder, setPendingBandOrder] = useState<{
    file: File;
    bandCount: number;
  } | null>(null);

  // Duplicate candidate prompt for BANDA_MANUAL
  const [duplicatePrompt, setDuplicatePrompt] = useState<{
    indexId: string;
    candidates: { bandNumber: number; name: string }[];
  } | null>(null);

  // Active index definition
  const indexDef = useMemo(() => {
    return INDICES_CATALOG.find((idx) => idx.id === selectedIndex) || INDICES_CATALOG[0];
  }, [selectedIndex]);

  // Set of available bands & layer sources
  const { availableBands, sourceDescriptions } = useMemo(() => {
    const avail = new Set<string>();
    const descs: Record<string, string> = {};

    for (const idx of INDICES_CATALOG) {
      const manualBandNum = manualBandOverrides[idx.id];
      if (manualBandNum && rasterData.rawBandNames[manualBandNum - 1]) {
        avail.add(idx.id);
        descs[idx.id] = `banda ${manualBandNum} ('${rasterData.rawBandNames[manualBandNum - 1]}') [selección manual]`;
        continue;
      }

      if (rasterData.bands.has(idx.id)) {
        avail.add(idx.id);
        const bandPos = rasterData.recognizedBands.findIndex((r) => r === idx.id);
        const originalName = bandPos >= 0 ? rasterData.rawBandNames[bandPos] : idx.id;
        descs[idx.id] = `banda ${bandPos >= 0 ? bandPos + 1 : '-'} ('${originalName}') [leída del archivo]`;
      } else {
        const expr = userFormulas[idx.id] || BASE_FORMULAS[idx.id];
        if (expr) {
          const required = expr.match(/\bB\d+A?\b/g) || [];
          const hasAll = required.every((b) => rasterData.bands.has(b));
          if (hasAll) {
            avail.add(idx.id);
            descs[idx.id] = `calculado: ${idx.id} = ${expr}`;
          } else {
            descs[idx.id] = `requiere reflectancias faltantes (${required.join(', ')})`;
          }
        } else {
          descs[idx.id] = `no viene como banda (requiere definir en FORMULAS_USUARIO)`;
        }
      }
    }

    return { availableBands: avail, sourceDescriptions: descs };
  }, [rasterData, userFormulas, manualBandOverrides]);

  // Compute or retrieve the active raster layer array
  const { activeLayerData, activeSourceDescription } = useMemo(() => {
    const manualBandNum = manualBandOverrides[selectedIndex];
    if (manualBandNum) {
      const rawName = rasterData.rawBandNames[manualBandNum - 1];
      const data = rasterData.bands.get(rawName);
      if (data) {
        return {
          activeLayerData: data,
          activeSourceDescription: `banda ${manualBandNum} ('${rawName}') [selección manual]`,
        };
      }
    }

    // 1. Direct band in file
    if (rasterData.bands.has(selectedIndex)) {
      const bandPos = rasterData.recognizedBands.findIndex((r) => r === selectedIndex);
      const originalName = bandPos >= 0 ? rasterData.rawBandNames[bandPos] : selectedIndex;
      return {
        activeLayerData: rasterData.bands.get(selectedIndex)!,
        activeSourceDescription: `banda ${bandPos >= 0 ? bandPos + 1 : '-'} ('${originalName}') [leída del archivo]`,
      };
    }

    // 2. Compute from reflectances
    const calc = calculateIndexFromBands(
      selectedIndex,
      rasterData.bands,
      rasterData.width,
      rasterData.height,
      userFormulas
    );
    if (calc) {
      return {
        activeLayerData: calc.data,
        activeSourceDescription: calc.source,
      };
    }

    // Fallback: empty array
    return {
      activeLayerData: new Float32Array(rasterData.width * rasterData.height).fill(NaN),
      activeSourceDescription: 'Capa no disponible en este archivo',
    };
  }, [selectedIndex, rasterData, manualBandOverrides, userFormulas]);

  // Compute statistics for active layer
  const statistics = useMemo(() => {
    return computeLayerStatistics(
      activeLayerData,
      rasterData.transform.pixelWidthMeters,
      rasterData.transform.pixelHeightMeters
    );
  }, [activeLayerData, rasterData.transform]);

  // Handle file upload
  const handleFileSelected = useCallback(async (file: File) => {
    const res = await parseGeoTiffFile(file);
    if (res.error) {
      alert(`Error al abrir GeoTIFF: ${res.error}`);
      return;
    }
    if (res.needsBandOrder) {
      setPendingBandOrder({
        file,
        bandCount: res.needsBandOrder.bandCount,
      });
      return;
    }
    if (res.data) {
      setRasterData(res.data);
      setManualBandOverrides({});
      if (!res.data.bands.has(selectedIndex) && res.data.bands.has('NDVI')) {
        setSelectedIndex('NDVI');
      }
    }
  }, [selectedIndex]);

  // Handle confirmed band order for unnamed TIFF
  const handleConfirmBandOrder = useCallback(async (bandOrder: string[]) => {
    if (!pendingBandOrder) return;
    const res = await parseGeoTiffFile(pendingBandOrder.file, bandOrder);
    if (res.data) {
      setRasterData(res.data);
      setManualBandOverrides({});
      setPendingBandOrder(null);
    } else if (res.error) {
      alert(`Error: ${res.error}`);
    }
  }, [pendingBandOrder]);

  // Handle reset to default AvellsFlor dataset
  const handleResetToDefault = useCallback(() => {
    setRasterData(createDefaultDataset());
    setManualBandOverrides({});
    setSelectedIndex('NDVI');
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors">
      {/* Top Navigation Bar with GEE API Integration & Mode Switcher */}
      <Header
        fileName={rasterData.fileName}
        bandCount={rasterData.rawBandNames.length}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenBandTable={() => setIsBandTableOpen(true)}
        onOpenFormulas={() => setIsFormulasOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenGEE={() => setIsGEEOpen(true)}
        currentView={currentView}
        onChangeView={setCurrentView}
        geeConnected={geeConfig.status === 'connected'}
      />

      {/* Categorized Index Buttons Ribbon */}
      <IndexSelector
        selectedIndex={selectedIndex}
        onSelectIndex={(id) => {
          const occurrences: { bandNumber: number; name: string }[] = [];
          rasterData.recognizedBands.forEach((rec, idx) => {
            if (rec === id) {
              occurrences.push({
                bandNumber: idx + 1,
                name: rasterData.rawBandNames[idx],
              });
            }
          });

          if (occurrences.length > 1 && !manualBandOverrides[id]) {
            setDuplicatePrompt({ indexId: id, candidates: occurrences });
          }
          setSelectedIndex(id);
        }}
        availableBands={availableBands}
        sourceDescriptions={sourceDescriptions}
      />

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* VIEW 1: Live GEE Interactive Canvas Mode */}
        {currentView === 'gee_canvas' ? (
          <GEEInteractiveCanvas
            currentDataset={rasterData}
            onExportLayer={(layerId) => {
              setSelectedIndex(layerId);
              setIsExportOpen(true);
            }}
          />
        ) : currentView === 'comparative' ? (
          /* VIEW 2: Multi-temporal Comparative Analysis */
          <div className="space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>Análisis Comparativo Interanual y Tendencias</span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-semibold">
                    Índice: {selectedIndex}
                  </span>
                </h1>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
                  Detección de patrones fenológicos, ganancias de biomasa y zonas con estrés persistente entre temporadas de floración (2023–2024, 2024–2025 y 2025–2026).
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  Superficie evaluada: <strong className="text-emerald-600 dark:text-emerald-400">131,0 ha</strong> (16.336 px a 8,1 × 9,9 m)
                </span>
              </div>
            </div>

            <ComparativeAnalysisView
              currentDataset={rasterData}
              currentIndexId={selectedIndex}
              onSelectIndex={setSelectedIndex}
              userFormulas={userFormulas}
              currentActiveLayerData={activeLayerData}
            />
          </div>
        ) : (
          /* VIEW 3: Single Layer GIS Map & Zonal Statistics */
          <div className="space-y-6">
            {/* Layer Info & Description Bar */}
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    {indexDef.name} — {indexDef.category}
                  </h1>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {rasterData.metadata.lotName || rasterData.fileName}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">
                  {indexDef.description}
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  Superficie activa: <strong className="text-emerald-600 dark:text-emerald-400">{statistics.areaHa.toFixed(1)} ha</strong> ({statistics.validCount.toLocaleString('es-CL')} píxeles)
                </span>
              </div>
            </div>

            {/* 2-Column Split: Interactive Map & Analytical Tray */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Raster Map (7 cols on lg) */}
              <div className="lg:col-span-7 space-y-4">
                <RasterMap
                  data={activeLayerData}
                  width={rasterData.width}
                  height={rasterData.height}
                  transform={rasterData.transform}
                  statistics={statistics}
                  layerId={selectedIndex}
                  colormapName={indexDef.defaultColormap}
                  unit={indexDef.unit}
                  sourceDescription={activeSourceDescription}
                  stretchMode={stretchMode}
                  onChangeStretchMode={setStretchMode}
                />

                {/* Geological & Agronomic Metadata Card */}
                <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs space-y-1.5 text-slate-600 dark:text-slate-400">
                  <div className="flex items-center justify-between font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800 pb-1">
                    <span>Metadatos del Vuelo / Satélite Sentinel-2</span>
                    <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">SR HARMONIZED</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px] pt-1">
                    <div>Lote: <span className="text-slate-800 dark:text-slate-200">{rasterData.metadata.lotName || 'Huerto Avellanos Sector 30'}</span></div>
                    <div>Cultivo: <span className="text-slate-800 dark:text-slate-200">{rasterData.metadata.cropType || 'Corylus avellana'}</span></div>
                    <div>Período: <span className="text-slate-800 dark:text-slate-200">{rasterData.metadata.capturePeriod || 'Nov 2025 – Ene 2026'}</span></div>
                    <div>Píxel terreno: <span className="text-slate-800 dark:text-slate-200">≈ 8,1 × 9,9 m (80,2 m²/px)</span></div>
                  </div>
                </div>
              </div>

              {/* Right Column: Statistics & Histogram (5 cols on lg) */}
              <div className="lg:col-span-5 space-y-5">
                <StatisticsPanel
                  stats={statistics}
                  layerId={selectedIndex}
                  unit={indexDef.unit}
                  transform={rasterData.transform}
                  sourceDescription={activeSourceDescription}
                />

                <HistogramChart
                  data={activeLayerData}
                  stats={statistics}
                  layerId={selectedIndex}
                  colormapName={indexDef.defaultColormap}
                  unit={indexDef.unit}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-3 px-4 sm:px-6 mt-8 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">AgroVision</span>
            <span>·</span>
            <span>Visor GeoTIFF Multiespectral & Comparativa Temporal de Precisión</span>
          </div>
          <div className="font-mono text-[11px]">
            API GEE: {geeConfig.projectId} ({geeConfig.collectionId})
          </div>
        </div>
      </footer>

      {/* Modals */}
      <GEEApiModal
        isOpen={isGEEOpen}
        onClose={() => setIsGEEOpen(false)}
        config={geeConfig}
        onUpdateConfig={setGeeConfig}
        onOpenCanvasView={() => setCurrentView('gee_canvas')}
      />

      <BandTableModal
        isOpen={isBandTableOpen}
        onClose={() => setIsBandTableOpen(false)}
        rasterData={rasterData}
      />

      {pendingBandOrder && (
        <BandOrderModal
          isOpen={true}
          fileName={pendingBandOrder.file.name}
          bandCount={pendingBandOrder.bandCount}
          onConfirm={handleConfirmBandOrder}
          onCancel={() => setPendingBandOrder(null)}
        />
      )}

      {duplicatePrompt && (
        <BandManualModal
          isOpen={true}
          indexId={duplicatePrompt.indexId}
          candidates={duplicatePrompt.candidates}
          onSelectBand={(num) => {
            setManualBandOverrides((prev) => ({
              ...prev,
              [duplicatePrompt.indexId]: num,
            }));
            setDuplicatePrompt(null);
          }}
          onClose={() => setDuplicatePrompt(null)}
        />
      )}

      <CustomFormulaModal
        isOpen={isFormulasOpen}
        userFormulas={userFormulas}
        onSaveFormulas={(updated) => setUserFormulas(updated)}
        onClose={() => setIsFormulasOpen(false)}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        layerId={selectedIndex}
        fileName={rasterData.fileName}
        data={activeLayerData}
        width={rasterData.width}
        height={rasterData.height}
        transform={rasterData.transform}
        statistics={statistics}
        sourceDescription={activeSourceDescription}
      />

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onFileSelected={handleFileSelected}
        onResetToDefault={handleResetToDefault}
        currentFileName={rasterData.fileName}
      />
    </div>
  );
}
