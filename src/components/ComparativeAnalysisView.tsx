import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import L from 'leaflet';
import {
  SplitSquareVertical,
  Columns,
  Activity,
  TrendingUp,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Crosshair,
  ArrowRight,
  Sparkles,
  Info,
  Layers,
  FileCheck2,
  Upload,
  MapPin,
  Tag,
  Check,
} from 'lucide-react';
import {
  ComparisonMode,
  GeoRasterData,
  GeoTransform,
} from '../types/geotiff';
import {
  COMPARATIVE_SEASONS_INFO,
  createDatasetForSeason,
  SeasonInfo,
} from '../utils/defaultDataset';
import {
  computeComparativeAnalysis,
  buildTemporalTimeSeries,
} from '../utils/comparativeAnalysis';
import { computeLayerStatistics } from '../utils/statistics';
import { getColormapCSSGradient } from '../utils/colormaps';
import { createRasterDataUrl } from '../utils/rasterToCanvas';
import { parseGeoTiffFile } from '../utils/geotiffParser';
import { calculateIndexFromBands } from '../utils/formulas';

interface ComparativeAnalysisViewProps {
  currentDataset: GeoRasterData;
  currentIndexId: string;
  onSelectIndex: (indexId: string) => void;
  userFormulas?: Record<string, string>;
  currentActiveLayerData?: Float32Array;
}

/**
 * Extracts index data array from dataset.
 * Handles: direct band key, aliases/normalized names, calculation from reflectances, and single-band rasters.
 */
function extractOrComputeIndexData(
  dataset: GeoRasterData,
  indexId: string,
  userFormulas: Record<string, string> = {}
): Float32Array {
  // 1. Direct band match
  if (dataset.bands.has(indexId)) {
    return dataset.bands.get(indexId)!;
  }

  // 2. Try aliases or normalized names
  for (const [key, arr] of dataset.bands.entries()) {
    const normKey = key.replace(/[^a-z0-9]/gi, '').toLowerCase();
    const normTarget = indexId.replace(/[^a-z0-9]/gi, '').toLowerCase();
    if (normKey === normTarget || normKey.endsWith(`_${normTarget}`) || normKey.startsWith(`${normTarget}_`)) {
      return arr;
    }
  }

  // 3. Calculate from reflectances
  const calc = calculateIndexFromBands(
    indexId,
    dataset.bands,
    dataset.width,
    dataset.height,
    userFormulas
  );
  if (calc && calc.data) {
    return calc.data;
  }

  // 4. If single band file (e.g. user exported a single 1-band GeoTIFF)
  if (dataset.rawBandNames.length === 1) {
    const single = dataset.bands.values().next().value;
    if (single) return single;
  }

  return new Float32Array(dataset.width * dataset.height).fill(NaN);
}

export const ComparativeAnalysisView: React.FC<ComparativeAnalysisViewProps> = ({
  currentDataset,
  currentIndexId,
  onSelectIndex,
  userFormulas = {},
  currentActiveLayerData,
}) => {
  // Season keys: 'current_loaded' refers explicitly to currentDataset loaded in "Visor de capas"
  const [seasonAKey, setSeasonAKey] = useState<string>('2024_2025');
  const [seasonBKey, setSeasonBKey] = useState<string>('current_loaded');
  const [mode, setMode] = useState<ComparisonMode>('swipe');
  const [swipePosition, setSwipePosition] = useState<number>(50); // 0 to 100%
  const [opacity, setOpacity] = useState<number>(0.80);

  // Basemap & Reference Labels settings
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [basemapType, setBasemapType] = useState<'hybrid' | 'satellite' | 'streets'>('hybrid');

  // Custom secondary uploaded file for comparison
  const [customSecondaryDataset, setCustomSecondaryDataset] = useState<GeoRasterData | null>(null);
  const secondaryFileInputRef = useRef<HTMLInputElement | null>(null);

  const seasonsCache = useRef<Map<string, GeoRasterData>>(new Map());

  // Combined seasons list including the current active TIFF from "Visor de capas"
  const availableSeasons: { key: string; name: string; isCurrent?: boolean; period?: string }[] = useMemo(() => {
    const list = [
      {
        key: 'current_loaded',
        name: `TIFF Activo en Visor (${currentDataset.fileName})`,
        isCurrent: true,
        period: currentDataset.metadata.capturePeriod || 'Archivo en memoria',
      },
    ];

    if (customSecondaryDataset) {
      list.push({
        key: 'custom_uploaded',
        name: `Segundo GeoTIFF Subido (${customSecondaryDataset.fileName})`,
        isCurrent: false,
        period: 'Archivo secundario',
      });
    }

    // Historical comparative seasons
    COMPARATIVE_SEASONS_INFO.forEach((s) => {
      // Don't duplicate if currentDataset is already named identically
      if (s.key !== '2025_2026' || !currentDataset.fileName.includes('nov25ene26')) {
        list.push({
          key: s.key,
          name: s.name,
          isCurrent: false,
          period: s.period,
        });
      }
    });

    return list;
  }, [currentDataset, customSecondaryDataset]);

  // Resolve Dataset A
  const datasetA = useMemo(() => {
    if (seasonAKey === 'current_loaded') {
      return currentDataset;
    }
    if (seasonAKey === 'custom_uploaded' && customSecondaryDataset) {
      return customSecondaryDataset;
    }
    if (!seasonsCache.current.has(seasonAKey)) {
      seasonsCache.current.set(seasonAKey, createDatasetForSeason(seasonAKey));
    }
    return seasonsCache.current.get(seasonAKey) || currentDataset;
  }, [seasonAKey, currentDataset, customSecondaryDataset]);

  // Resolve Dataset B
  const datasetB = useMemo(() => {
    if (seasonBKey === 'current_loaded') {
      return currentDataset;
    }
    if (seasonBKey === 'custom_uploaded' && customSecondaryDataset) {
      return customSecondaryDataset;
    }
    if (!seasonsCache.current.has(seasonBKey)) {
      seasonsCache.current.set(seasonBKey, createDatasetForSeason(seasonBKey));
    }
    return seasonsCache.current.get(seasonBKey) || currentDataset;
  }, [seasonBKey, currentDataset, customSecondaryDataset]);

  // Extract raster data arrays
  const dataA = useMemo(() => {
    if (seasonAKey === 'current_loaded' && currentActiveLayerData) {
      return currentActiveLayerData;
    }
    return extractOrComputeIndexData(datasetA, currentIndexId, userFormulas);
  }, [datasetA, currentIndexId, userFormulas, seasonAKey, currentActiveLayerData]);

  const dataB = useMemo(() => {
    if (seasonBKey === 'current_loaded' && currentActiveLayerData) {
      return currentActiveLayerData;
    }
    return extractOrComputeIndexData(datasetB, currentIndexId, userFormulas);
  }, [datasetB, currentIndexId, userFormulas, seasonBKey, currentActiveLayerData]);

  // Compute differential and trend analysis
  const comparativeResult = useMemo(() => {
    const nameA = availableSeasons.find((s) => s.key === seasonAKey)?.name || seasonAKey;
    const nameB = availableSeasons.find((s) => s.key === seasonBKey)?.name || seasonBKey;

    return computeComparativeAnalysis(
      dataA,
      dataB,
      nameA,
      nameB,
      currentIndexId,
      datasetA.transform.pixelWidthMeters,
      datasetA.transform.pixelHeightMeters
    );
  }, [dataA, dataB, seasonAKey, seasonBKey, currentIndexId, datasetA.transform, availableSeasons]);

  const statsA = useMemo(() => {
    return computeLayerStatistics(dataA, datasetA.transform.pixelWidthMeters, datasetA.transform.pixelHeightMeters);
  }, [dataA, datasetA.transform]);

  const statsB = useMemo(() => {
    return computeLayerStatistics(dataB, datasetB.transform.pixelWidthMeters, datasetB.transform.pixelHeightMeters);
  }, [dataB, datasetB.transform]);

  const timeSeries = useMemo(() => {
    return buildTemporalTimeSeries(currentIndexId, seasonsCache.current);
  }, [currentIndexId]);

  // Geographic bounds for Dataset A
  const boundsA: L.LatLngBoundsExpression = useMemo(() => {
    const south = datasetA.transform.north - datasetA.height * datasetA.transform.pixelHeight;
    const north = datasetA.transform.north;
    const west = datasetA.transform.west;
    const east = datasetA.transform.west + datasetA.width * datasetA.transform.pixelWidth;
    return [[south, west], [north, east]];
  }, [datasetA]);

  // Geographic bounds for Dataset B
  const boundsB: L.LatLngBoundsExpression = useMemo(() => {
    const south = datasetB.transform.north - datasetB.height * datasetB.transform.pixelHeight;
    const north = datasetB.transform.north;
    const west = datasetB.transform.west;
    const east = datasetB.transform.west + datasetB.width * datasetB.transform.pixelWidth;
    return [[south, west], [north, east]];
  }, [datasetB]);

  // Leaflet map refs for Single / Swipe / Delta mode
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const overlayARef = useRef<L.ImageOverlay | null>(null);
  const overlayBRef = useRef<L.ImageOverlay | null>(null);
  const overlayDiffRef = useRef<L.ImageOverlay | null>(null);
  const baseTilesRef = useRef<L.TileLayer | null>(null);
  const labelsLayerRef = useRef<L.TileLayer | null>(null);
  const roadsLayerRef = useRef<L.TileLayer | null>(null);

  // Leaflet map refs for Side-by-Side Dual View
  const sideMapContainerARef = useRef<HTMLDivElement | null>(null);
  const sideMapContainerBRef = useRef<HTMLDivElement | null>(null);
  const sideMapARef = useRef<L.Map | null>(null);
  const sideMapBRef = useRef<L.Map | null>(null);

  // Hover Probe State
  const [hoverInfo, setHoverInfo] = useState<{
    px: number;
    py: number;
    valA: number;
    valB: number;
    diff: number;
    lat: number;
    lon: number;
  } | null>(null);

  const [isSwiping, setIsSwiping] = useState<boolean>(false);

  // Handle uploading a secondary TIFF file for comparison
  const handleUploadSecondaryFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const res = await parseGeoTiffFile(file);
    if (res.error) {
      alert(`Error al cargar archivo secundario: ${res.error}`);
      return;
    }
    if (res.data) {
      setCustomSecondaryDataset(res.data);
      setSeasonAKey('custom_uploaded');
    }
  };

  // Initialize or Invalidate Main Map
  useEffect(() => {
    if (mode === 'side_by_side' || mode === 'temporal_trend') return;
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const transform = datasetB.transform;
      const south = transform.north - datasetB.height * transform.pixelHeight;
      const north = transform.north;
      const west = transform.west;
      const east = transform.west + datasetB.width * transform.pixelWidth;
      const centerLat = (north + south) / 2;
      const centerLon = (west + east) / 2;

      const map = L.map(mapContainerRef.current, {
        center: [centerLat, centerLon],
        zoom: 15,
        zoomControl: false,
        attributionControl: false,
      });

      // Dedicated pane for labels and place names so they remain above raster layers
      if (!map.getPane('labelsPane')) {
        const pane = map.createPane('labelsPane');
        pane.style.zIndex = '500';
        pane.style.pointerEvents = 'none';
      }

      // Base satellite imagery
      const baseTiles = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
          attribution: 'Esri World Imagery',
        }
      ).addTo(map);
      baseTilesRef.current = baseTiles;

      // Reference labels: towns, cities, administrative boundaries
      const labels = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
          pane: 'labelsPane',
        }
      ).addTo(map);
      labelsLayerRef.current = labels;

      // Transportation layer: highways, roads, routes
      const roads = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
          pane: 'labelsPane',
        }
      ).addTo(map);
      roadsLayerRef.current = roads;

      // Parcel boundary polygon
      L.polygon(
        [
          [north, west],
          [north, east],
          [south, east],
          [south, west],
        ],
        {
          color: '#10b981',
          weight: 1.5,
          fill: false,
          dashArray: '3 3',
        }
      ).addTo(map);

      mapInstanceRef.current = map;
      map.fitBounds(boundsB, { padding: [25, 25] });

      map.on('mousemove', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        const curTransform = datasetB.transform;
        const s = curTransform.north - datasetB.height * curTransform.pixelHeight;
        const n = curTransform.north;
        const w = curTransform.west;
        const ea = curTransform.west + datasetB.width * curTransform.pixelWidth;

        if (lat >= s && lat <= n && lng >= w && lng <= ea) {
          const py = Math.floor(((n - lat) / (n - s)) * datasetB.height);
          const px = Math.floor(((lng - w) / (ea - w)) * datasetB.width);

          if (px >= 0 && px < datasetB.width && py >= 0 && py < datasetB.height) {
            const idx = py * datasetB.width + px;
            setHoverInfo({
              px,
              py,
              valA: dataA[idx],
              valB: dataB[idx],
              diff: comparativeResult.deltaData[idx],
              lat,
              lon: lng,
            });
          }
        } else {
          setHoverInfo(null);
        }
      });

      map.on('mouseout', () => {
        setHoverInfo(null);
      });
    }

    // Force size invalidation
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
        mapInstanceRef.current.fitBounds(boundsB, { padding: [25, 25] });
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [mode, boundsB, datasetB, dataA, dataB, comparativeResult.deltaData]);

  // Update basemap tiles and reference labels visibility
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (basemapType === 'streets') {
      baseTilesRef.current?.setUrl('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
    } else {
      baseTilesRef.current?.setUrl('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}');
    }

    if (showLabels && basemapType !== 'streets') {
      if (labelsLayerRef.current && !map.hasLayer(labelsLayerRef.current)) {
        map.addLayer(labelsLayerRef.current);
      }
      if (roadsLayerRef.current && !map.hasLayer(roadsLayerRef.current)) {
        map.addLayer(roadsLayerRef.current);
      }
    } else {
      if (labelsLayerRef.current && map.hasLayer(labelsLayerRef.current)) {
        map.removeLayer(labelsLayerRef.current);
      }
      if (roadsLayerRef.current && map.hasLayer(roadsLayerRef.current)) {
        map.removeLayer(roadsLayerRef.current);
      }
    }
  }, [basemapType, showLabels]);

  // Initialize Side-by-Side Dual Maps
  useEffect(() => {
    if (mode !== 'side_by_side') {
      if (sideMapARef.current) {
        sideMapARef.current.remove();
        sideMapARef.current = null;
      }
      if (sideMapBRef.current) {
        sideMapBRef.current.remove();
        sideMapBRef.current = null;
      }
      return;
    }

    if (!sideMapContainerARef.current || !sideMapContainerBRef.current) return;

    const transform = datasetB.transform;
    const south = transform.north - datasetB.height * transform.pixelHeight;
    const north = transform.north;
    const west = transform.west;
    const east = transform.west + datasetB.width * transform.pixelWidth;
    const centerLat = (north + south) / 2;
    const centerLon = (west + east) / 2;

    const colormap = currentIndexId === 'DEM' ? 'terrain' : currentIndexId === 'Slope' ? 'magma' : currentIndexId.startsWith('NDM') ? 'BrBG' : 'RdYlGn';
    const urlA = createRasterDataUrl(dataA, datasetA.width, datasetA.height, colormap, 0.1, 0.9, opacity);
    const urlB = createRasterDataUrl(dataB, datasetB.width, datasetB.height, colormap, 0.1, 0.9, opacity);

    // Map A
    const mapA = L.map(sideMapContainerARef.current, {
      center: [centerLat, centerLon],
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
    });
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 }).addTo(mapA);
    if (showLabels) {
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 }).addTo(mapA);
    }
    L.imageOverlay(urlA, boundsA, { opacity, interactive: false }).addTo(mapA);
    mapA.fitBounds(boundsA, { padding: [15, 15] });

    // Map B
    const mapB = L.map(sideMapContainerBRef.current, {
      center: [centerLat, centerLon],
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
    });
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 }).addTo(mapB);
    if (showLabels) {
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 }).addTo(mapB);
    }
    L.imageOverlay(urlB, boundsB, { opacity, interactive: false }).addTo(mapB);
    mapB.fitBounds(boundsB, { padding: [15, 15] });

    // Synchronize Pan & Zoom
    let syncing = false;
    mapA.on('move', () => {
      if (!syncing) {
        syncing = true;
        mapB.setView(mapA.getCenter(), mapA.getZoom(), { animate: false });
        syncing = false;
      }
    });

    mapB.on('move', () => {
      if (!syncing) {
        syncing = true;
        mapA.setView(mapB.getCenter(), mapB.getZoom(), { animate: false });
        syncing = false;
      }
    });

    sideMapARef.current = mapA;
    sideMapBRef.current = mapB;

    setTimeout(() => {
      mapA.invalidateSize();
      mapB.invalidateSize();
    }, 150);

    return () => {
      mapA.remove();
      mapB.remove();
      sideMapARef.current = null;
      sideMapBRef.current = null;
    };
  }, [mode, dataA, dataB, currentIndexId, opacity, boundsA, boundsB, datasetA, datasetB, showLabels]);

  // Update Raster Overlays on Main Map (Swipe or Difference)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || mode === 'side_by_side' || mode === 'temporal_trend') return;

    const colormap = currentIndexId === 'DEM' ? 'terrain' : currentIndexId === 'Slope' ? 'magma' : currentIndexId.startsWith('NDM') ? 'BrBG' : 'RdYlGn';

    const urlA = createRasterDataUrl(dataA, datasetA.width, datasetA.height, colormap, 0.1, 0.9, 1.0);
    const urlB = createRasterDataUrl(dataB, datasetB.width, datasetB.height, colormap, 0.1, 0.9, 1.0);
    const urlDiff = createRasterDataUrl(comparativeResult.deltaData, datasetA.width, datasetA.height, 'difference', -0.22, 0.22, 1.0);

    if (overlayARef.current) map.removeLayer(overlayARef.current);
    if (overlayBRef.current) map.removeLayer(overlayBRef.current);
    if (overlayDiffRef.current) map.removeLayer(overlayDiffRef.current);

    if (mode === 'swipe') {
      overlayARef.current = L.imageOverlay(urlA, boundsA, { opacity, interactive: false }).addTo(map);
      const imgB = L.imageOverlay(urlB, boundsB, { opacity, interactive: false }).addTo(map);
      overlayBRef.current = imgB;

      const applyClip = () => {
        const el = imgB.getElement();
        if (el) {
          el.style.clipPath = `inset(0 0 0 ${swipePosition}%)`;
          el.style.transition = 'none';
        }
      };
      applyClip();
      imgB.on('load', applyClip);
    } else if (mode === 'difference') {
      overlayDiffRef.current = L.imageOverlay(urlDiff, boundsA, { opacity, interactive: false }).addTo(map);
    }
  }, [mode, dataA, dataB, comparativeResult.deltaData, currentIndexId, opacity, boundsA, boundsB, datasetA, datasetB]);

  // Update swipe divider clipPath smoothly without rebuilding layers
  useEffect(() => {
    if (mode === 'swipe' && overlayBRef.current) {
      const elB = overlayBRef.current.getElement();
      if (elB) {
        elB.style.clipPath = `inset(0 0 0 ${swipePosition}%)`;
      }
    }
  }, [swipePosition, mode]);

  const handleContainerMouseMove = (e: React.MouseEvent) => {
    if (isSwiping && mapContainerRef.current) {
      const rect = mapContainerRef.current.getBoundingClientRect();
      const pos = ((e.clientX - rect.left) / rect.width) * 100;
      setSwipePosition(Math.max(5, Math.min(95, pos)));
    }
  };

  const formatCoord = (deg: number, isLat: boolean) => {
    const abs = Math.abs(deg);
    const d = Math.floor(abs);
    const m = Math.floor((abs - d) * 60);
    const s = ((abs - d - m / 60) * 3600).toFixed(1);
    const dir = isLat ? (deg >= 0 ? 'N' : 'S') : (deg >= 0 ? 'E' : 'W');
    return `${d}°${m}'${s}"${dir}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Active GeoTIFF Status & Season Selectors */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
        {/* Active Loaded TIFF Indicator */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-slate-600 dark:text-slate-400">GeoTIFF Activo en Visor:</span>
            <strong className="font-mono text-slate-800 dark:text-slate-200 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded flex items-center gap-1.5">
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>{currentDataset.fileName}</span>
            </strong>
            <span className="text-slate-400 font-mono text-[11px]">
              ({currentDataset.rawBandNames.length} bandas · {datasetB.width} × {datasetB.height} px)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={secondaryFileInputRef}
              type="file"
              accept=".tif,.tiff"
              onChange={handleUploadSecondaryFile}
              className="hidden"
            />
            <button
              onClick={() => secondaryFileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium border border-slate-200 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Cargar un segundo archivo GeoTIFF para contrastar contra el activo"
            >
              <Upload className="w-3 h-3 text-emerald-600" />
              <span>Cargar Segundo GeoTIFF para Contrastar</span>
            </button>
          </div>
        </div>

        {/* Season A vs Season B Selectors + Mode Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Season A Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Temporada A (Base):
              </span>
              <select
                value={seasonAKey}
                onChange={(e) => setSeasonAKey(e.target.value)}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 max-w-[260px] truncate"
              >
                {availableSeasons.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-slate-400 font-bold">vs</div>

            {/* Season B Selector (Defaults to current_loaded) */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Temporada B (Evaluación):
              </span>
              <select
                value={seasonBKey}
                onChange={(e) => setSeasonBKey(e.target.value)}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-emerald-500/80 dark:border-emerald-700 bg-emerald-50/50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 max-w-[280px] truncate"
              >
                {availableSeasons.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Visual Mode Selector */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button
              onClick={() => setMode('swipe')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                mode === 'swipe'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <SplitSquareVertical className="w-3.5 h-3.5" />
              <span>Cortinilla (Swipe)</span>
            </button>

            <button
              onClick={() => setMode('side_by_side')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                mode === 'side_by_side'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Lado a Lado</span>
            </button>

            <button
              onClick={() => setMode('difference')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                mode === 'difference'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Mapa Delta (Δ)</span>
            </button>

            <button
              onClick={() => setMode('temporal_trend')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                mode === 'temporal_trend'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Tendencia Multianual</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Comparative Stage with Real Satellite Basemap & Reference Labels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Interactive Map Stage (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="relative bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-lg select-none">
            {/* Top Viewport Ribbon */}
            <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs text-slate-300 font-mono gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-emerald-400">{currentIndexId}</span>
                <span>·</span>
                <span className="truncate max-w-[280px]">
                  {mode === 'difference'
                    ? `Mapa de Cambio Δ (${comparativeResult.seasonBName} - ${comparativeResult.seasonAName})`
                    : mode === 'side_by_side'
                    ? 'Visualización Dual Lado a Lado (Sincronizada)'
                    : `${comparativeResult.seasonAName} ⇄ ${comparativeResult.seasonBName}`}
                </span>
              </div>

              {/* Controls: Basemap & Labels Toggle & Opacity */}
              <div className="flex items-center gap-3">
                {/* Labels ON/OFF toggle button */}
                <button
                  onClick={() => setShowLabels(!showLabels)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                    showLabels
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                  title="Activa o desactiva las etiquetas de ciudades, caminos y nombres de lugares para orientarte"
                >
                  <Tag className="w-3 h-3" />
                  <span>Etiquetas: {showLabels ? 'ON' : 'OFF'}</span>
                </button>

                {/* Basemap switcher */}
                <select
                  value={basemapType}
                  onChange={(e) => setBasemapType(e.target.value as any)}
                  className="bg-slate-800 border border-slate-700 text-slate-200 text-[11px] rounded px-2 py-1 focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="hybrid">🛰️ Satelital Híbrido</option>
                  <option value="satellite">🌍 Satelital Puro</option>
                  <option value="streets">🗺️ Calles OpenStreetMap</option>
                </select>

                {/* Opacity slider */}
                <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
                  <span className="text-slate-400 text-[10px]">Opacidad:</span>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={opacity}
                    onChange={(e) => setOpacity(parseFloat(e.target.value))}
                    className="w-14 h-1.5 accent-emerald-600 cursor-pointer"
                    title="Desliza para ver más satélite de fondo"
                  />
                  <span className="text-[10px] text-slate-400 w-6 font-mono">{Math.round(opacity * 100)}%</span>
                </div>
              </div>
            </div>

            {/* STAGE A: Main Map Container (Swipe & Difference Modes) */}
            {mode !== 'side_by_side' && mode !== 'temporal_trend' && (
              <div
                onMouseMove={handleContainerMouseMove}
                onMouseUp={() => setIsSwiping(false)}
                className="relative w-full h-[520px] bg-slate-950 overflow-hidden"
              >
                <div ref={mapContainerRef} className="w-full h-full z-10" />

                {/* Swipe Vertical Handle */}
                {mode === 'swipe' && (
                  <>
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-white shadow-2xl z-30 cursor-ew-resize"
                      style={{ left: `${swipePosition}%` }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setIsSwiping(true);
                      }}
                    >
                      <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-white text-slate-900 shadow-2xl flex items-center justify-center text-xs font-bold border border-slate-300">
                        ⇄
                      </div>
                    </div>

                    <div className="absolute top-3 left-3 bg-slate-950/90 text-white px-2.5 py-1 rounded-md text-[11px] font-mono border border-slate-700 pointer-events-none z-20">
                      ◀ {comparativeResult.seasonAName}
                    </div>
                    <div className="absolute top-3 right-3 bg-slate-950/90 text-white px-2.5 py-1 rounded-md text-[11px] font-mono border border-slate-700 pointer-events-none z-20">
                      {comparativeResult.seasonBName} ▶
                    </div>
                  </>
                )}

                {/* Floating Hover Info */}
                {hoverInfo && (
                  <div className="absolute top-12 left-3 bg-slate-950/92 backdrop-blur-md text-white border border-slate-700 rounded-lg p-2.5 shadow-2xl pointer-events-none text-xs z-30 font-mono space-y-1 max-w-[270px]">
                    <div className="flex items-center gap-1.5 text-emerald-400 border-b border-slate-800 pb-1">
                      <Crosshair className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-semibold text-slate-200">
                        Píxel [{hoverInfo.px}, {hoverInfo.py}]
                      </span>
                    </div>
                    <div className="text-[11px] space-y-0.5">
                      <div className="flex justify-between">
                        <span className="text-slate-400">A ({seasonAKey}):</span>
                        <span className="font-bold">{!isNaN(hoverInfo.valA) ? hoverInfo.valA.toFixed(3) : '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">B ({seasonBKey === 'current_loaded' ? 'Actual' : seasonBKey}):</span>
                        <span className="font-bold text-emerald-400">{!isNaN(hoverInfo.valB) ? hoverInfo.valB.toFixed(3) : '—'}</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-800 pt-0.5 font-bold">
                        <span className="text-slate-400">Cambio (Δ):</span>
                        <span className={hoverInfo.diff > 0 ? 'text-emerald-400' : hoverInfo.diff < 0 ? 'text-rose-400' : 'text-slate-300'}>
                          {hoverInfo.diff > 0 ? `+${hoverInfo.diff.toFixed(3)}` : hoverInfo.diff.toFixed(3)}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 pt-0.5">
                        {formatCoord(hoverInfo.lat, true)} {formatCoord(hoverInfo.lon, false)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Bottom map references */}
                <div className="absolute bottom-3 left-3 bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-md px-2 py-1 text-[10px] font-mono text-slate-300 z-20 flex items-center gap-2">
                  <MapPin className="w-3 h-3 text-emerald-400" />
                  <span>Sector 30 · Maule, Chile (WGS84)</span>
                </div>
              </div>
            )}

            {/* STAGE B: Side-by-Side Dual Synchronized Maps */}
            {mode === 'side_by_side' && (
              <div className="grid grid-cols-2 h-[520px] bg-slate-950 divide-x divide-slate-800 relative">
                <div className="relative w-full h-full">
                  <div ref={sideMapContainerARef} className="w-full h-full" />
                  <div className="absolute top-3 left-3 bg-slate-950/90 text-white px-2 py-1 rounded text-[11px] font-mono border border-slate-700 z-20">
                    A: {comparativeResult.seasonAName}
                  </div>
                </div>
                <div className="relative w-full h-full">
                  <div ref={sideMapContainerBRef} className="w-full h-full" />
                  <div className="absolute top-3 left-3 bg-slate-950/90 text-emerald-400 px-2 py-1 rounded text-[11px] font-mono border border-slate-700 z-20">
                    B: {comparativeResult.seasonBName}
                  </div>
                </div>
              </div>
            )}

            {/* STAGE C: Multi-annual Temporal Evolution */}
            {mode === 'temporal_trend' && (
              <div className="p-6 h-[520px] bg-slate-950 text-white overflow-y-auto space-y-6">
                <div className="border-b border-slate-800 pb-3">
                  <h4 className="font-bold text-sm text-emerald-400">
                    Evolución Multianual del Lote ({currentIndexId})
                  </h4>
                  <p className="text-xs text-slate-400">
                    Comparación histórica multitemporal desde la fase juvenil 2023 hasta la actualidad 2026.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {timeSeries.map((t) => (
                    <div
                      key={t.seasonKey}
                      className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1.5"
                    >
                      <div className="text-[11px] text-slate-400 font-mono">{t.dateRange}</div>
                      <div className="text-xs font-bold text-slate-200">{t.seasonLabel}</div>
                      <div className="text-xl font-bold font-mono text-emerald-400 pt-1">
                        {t.mean.toFixed(3)}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Desv: ±{t.stdDev.toFixed(3)} · Med: {t.median.toFixed(3)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="text-xs font-bold text-slate-300">
                    Trayectoria del Dosel Vegetal y Tendencia en el Huerto:
                  </div>
                  <div className="text-xs text-slate-400 leading-relaxed space-y-2">
                    <p>
                      • <strong>2023–2024:</strong> Media de {currentIndexId} en 0.62. Estado de copa en formación con suelo visible inter-hilera.
                    </p>
                    <p>
                      • <strong>2024–2025:</strong> Crecimiento vegetativo con cierre progresivo de hilera (+0.07 en {currentIndexId}).
                    </p>
                    <p>
                      • <strong>2025–2026 (Actual):</strong> Máximo vigor registrado ({statsB.mean.toFixed(3)}), consolidando copa productiva homogénea y óptima intercepción de radiación.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Comparative Analytical Tray (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Agronomic Change Classification */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                  Diagnóstico de Cambio (Δ = B - A)
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                {comparativeResult.deltaStats.areaHa.toFixed(1)} ha evaluadas
              </span>
            </div>

            {/* Change distribution bars */}
            <div className="space-y-2 text-xs">
              {comparativeResult.classifications.map((cls) => (
                <div key={cls.category} className="space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cls.color }} />
                      <span className="text-slate-700 dark:text-slate-300 font-medium">{cls.label}</span>
                    </div>
                    <div className="font-mono text-slate-600 dark:text-slate-400">
                      <strong>{cls.hectares.toFixed(1)} ha</strong> ({cls.percentage.toFixed(1)}%)
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${cls.percentage}%`,
                        backgroundColor: cls.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Differential Statistics Table */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Estadísticas Comparativas
              </div>
              <div className="grid grid-cols-3 gap-2 text-center font-mono">
                <div className="p-2 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] text-slate-500">Media A</div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                    {statsA.mean.toFixed(3)}
                  </div>
                </div>
                <div className="p-2 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] text-slate-500">Media B</div>
                  <div className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                    {statsB.mean.toFixed(3)}
                  </div>
                </div>
                <div className="p-2 rounded bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                  <div className="text-[10px] text-emerald-700 dark:text-emerald-300">Δ Promedio</div>
                  <div className={`font-bold text-xs ${comparativeResult.deltaStats.mean >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {comparativeResult.deltaStats.mean >= 0 ? `+${comparativeResult.deltaStats.mean.toFixed(3)}` : comparativeResult.deltaStats.mean.toFixed(3)}
                  </div>
                </div>
              </div>
            </div>

            {/* Interpretation Card */}
            <div className="p-3 bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 rounded-lg text-xs space-y-1">
              <span className="font-bold text-emerald-900 dark:text-emerald-300 block">
                Interpretación Agronómica:
              </span>
              <p className="text-emerald-800 dark:text-emerald-400 text-[11px] leading-relaxed">
                {comparativeResult.deltaStats.mean > 0.02
                  ? `El huerto presenta una ganancia neta positiva de vigor (+${(comparativeResult.deltaStats.mean * 100).toFixed(1)}%) en la Temporada B respecto a la A, indicativo de mayor biomasa fotosintéticamente activa y desarrollo armónico del dosel.`
                  : comparativeResult.deltaStats.mean < -0.02
                  ? `Se observa una disminución promedio en ${currentIndexId}. Conviene revisar los sectores coloreados en rojo/naranja en el mapa Delta para descartar estrés hídrico o problemas en emisores de riego.`
                  : `El vigor se mantiene altamente estable entre ambos períodos analizados dentro del rango fisiológico normal.`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
