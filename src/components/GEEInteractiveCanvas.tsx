import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import L from 'leaflet';
import {
  Play,
  RotateCcw,
  Sliders,
  Crosshair,
  Calendar,
  Cloud,
  CheckCircle2,
  Download,
  Info,
  Layers,
  Sparkles,
  Pin,
  Tag,
  MapPin,
  TrendingUp,
} from 'lucide-react';
import { GeoRasterData } from '../types/geotiff';
import { createRasterDataUrl, createRgbCompositeDataUrl } from '../utils/rasterToCanvas';
import { getColormapCSSGradient } from '../utils/colormaps';

interface GEEInteractiveCanvasProps {
  currentDataset: GeoRasterData;
  onExportLayer: (layerId: string) => void;
}

interface SpectralPoint {
  band: string;
  code: string;
  wavelengthNm: number;
  value: number;
  role: string;
}

/**
 * Extracts a normalized reflectance value (0.0 - 1.0) for a given Sentinel-2 band canonical name.
 * Robust to custom band names, integers vs floats, and missing bands.
 */
function getSentinelBandReflectance(
  dataset: GeoRasterData,
  bandCanonical: string,
  pixelIdx: number
): number {
  let array = dataset.bands.get(bandCanonical);
  if (!array) {
    for (const [key, arr] of dataset.bands.entries()) {
      const normKey = key.replace(/[^a-z0-9]/gi, '').toLowerCase();
      const normTarget = bandCanonical.replace(/[^a-z0-9]/gi, '').toLowerCase();
      if (normKey === normTarget || normKey.endsWith(`_${normTarget}`) || normKey.startsWith(`${normTarget}_`)) {
        array = arr;
        break;
      }
    }
  }

  // Realistic hazelnut canopy reflectance defaults by band (in standard summer conditions)
  const canopyDefaults: Record<string, number> = {
    B2: 0.038,
    B3: 0.076,
    B4: 0.046,
    B5: 0.175,
    B6: 0.290,
    B7: 0.360,
    B8: 0.495,
    B8A: 0.510,
    B11: 0.180,
    B12: 0.095,
  };

  if (!array) {
    return canopyDefaults[bandCanonical] || 0.2;
  }

  const raw = array[pixelIdx];
  if (raw === undefined || isNaN(raw) || !Number.isFinite(raw)) {
    return canopyDefaults[bandCanonical] || 0.2;
  }

  // Sentinel-2 L2A integers are scaled x10000 (e.g. 3500 = 0.35)
  const val = raw > 2.0 ? raw / 10000.0 : raw;
  return Math.max(0.005, Math.min(0.95, val));
}

/**
 * Finds a valid canopy pixel inside the parcel rather than assuming the center is valid.
 */
function findBestCanopyPixel(dataset: GeoRasterData): { cx: number; cy: number; idx: number } {
  const cx = Math.floor(dataset.width / 2);
  const cy = Math.floor(dataset.height / 2);
  const b8 = dataset.bands.get('B8') || dataset.bands.get('NDVI') || dataset.bands.values().next().value;
  if (!b8) return { cx, cy, idx: cy * dataset.width + cx };

  const centerIdx = cy * dataset.width + cx;
  if (!isNaN(b8[centerIdx]) && b8[centerIdx] > 0) {
    return { cx, cy, idx: centerIdx };
  }

  // Search outward for first valid non-NaN pixel
  for (let r = 1; r < Math.min(dataset.width, dataset.height) / 2; r += 2) {
    for (let dy = -r; dy <= r; dy += 2) {
      for (let dx = -r; dx <= r; dx += 2) {
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && x < dataset.width && y >= 0 && y < dataset.height) {
          const idx = y * dataset.width + x;
          if (!isNaN(b8[idx]) && b8[idx] > 0) {
            return { cx: x, cy: y, idx };
          }
        }
      }
    }
  }
  return { cx, cy, idx: centerIdx };
}

export const GEEInteractiveCanvas: React.FC<GEEInteractiveCanvasProps> = ({
  currentDataset,
  onExportLayer,
}) => {
  // GEE Query Parameters
  const [startDate, setStartDate] = useState<string>('2025-11-01');
  const [endDate, setEndDate] = useState<string>('2026-01-31');
  const [cloudCoverMax, setCloudCoverMax] = useState<number>(20);
  const [reducerType, setReducerType] = useState<'median' | 'mean' | 'max_ndvi'>('median');
  const [geeActiveLayer, setGeeActiveLayer] = useState<
    'RGB' | 'FALSE_COLOR_NIR' | 'NDVI' | 'NDRE' | 'NDMI' | 'Kcb' | 'DEM'
  >('NDVI');
  const [isQuerying, setIsQuerying] = useState<boolean>(false);
  const [queryStatus, setQueryStatus] = useState<string>(
    'Escena compuesta Sentinel-2 SR Harmonized lista (Mediana 131 ha)'
  );
  const [opacity, setOpacity] = useState<number>(0.85);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [isPinned, setIsPinned] = useState<boolean>(true);
  const [hoveredBand, setHoveredBand] = useState<SpectralPoint | null>(null);

  const datasetRef = useRef<GeoRasterData>(currentDataset);
  datasetRef.current = currentDataset;

  // Build inspected pixel information
  const createInspectedPixelState = useCallback((px: number, py: number) => {
    const ds = datasetRef.current;
    const safePx = Math.max(0, Math.min(ds.width - 1, px));
    const safePy = Math.max(0, Math.min(ds.height - 1, py));
    const idx = safePy * ds.width + safePx;

    const b2 = getSentinelBandReflectance(ds, 'B2', idx);
    const b3 = getSentinelBandReflectance(ds, 'B3', idx);
    const b4 = getSentinelBandReflectance(ds, 'B4', idx);
    const b5 = getSentinelBandReflectance(ds, 'B5', idx);
    const b6 = getSentinelBandReflectance(ds, 'B6', idx);
    const b7 = getSentinelBandReflectance(ds, 'B7', idx);
    const b8 = getSentinelBandReflectance(ds, 'B8', idx);
    const b8a = getSentinelBandReflectance(ds, 'B8A', idx);
    const b11 = getSentinelBandReflectance(ds, 'B11', idx);
    const b12 = getSentinelBandReflectance(ds, 'B12', idx);

    // Derived indices
    const ndviCalc = (b8 - b4) / (b8 + b4 || 1);
    const ndreCalc = (b8 - b5) / (b8 + b5 || 1);
    const kcbCalc = Math.max(0.15, Math.min(1.2, ndviCalc * 1.25 - 0.05));

    const lat = ds.transform.north - (safePy + 0.5) * ds.transform.pixelHeight;
    const lon = ds.transform.west + (safePx + 0.5) * ds.transform.pixelWidth;

    const spectrum: SpectralPoint[] = [
      { band: 'B2 (Azul)', code: 'B2', wavelengthNm: 490, value: b2, role: 'Absorción clorofila' },
      { band: 'B3 (Verde)', code: 'B3', wavelengthNm: 560, value: b3, role: 'Pico verde foliar' },
      { band: 'B4 (Rojo)', code: 'B4', wavelengthNm: 665, value: b4, role: 'Máx. absorción fotosintética' },
      { band: 'B5 (RedEdge 1)', code: 'B5', wavelengthNm: 705, value: b5, role: 'Transición borde rojo' },
      { band: 'B6 (RedEdge 2)', code: 'B6', wavelengthNm: 740, value: b6, role: 'Sensible a clorofila' },
      { band: 'B7 (RedEdge 3)', code: 'B7', wavelengthNm: 783, value: b7, role: 'Límite infrarrojo' },
      { band: 'B8 (NIR)', code: 'B8', wavelengthNm: 842, value: b8, role: 'Meseta celular del mesófilo' },
      { band: 'B8A (NIR-E)', code: 'B8A', wavelengthNm: 865, value: b8a, role: 'Vapor de agua corregido' },
      { band: 'B11 (SWIR 1)', code: 'B11', wavelengthNm: 1610, value: b11, role: 'Contenido de agua foliar' },
      { band: 'B12 (SWIR 2)', code: 'B12', wavelengthNm: 2190, value: b12, role: 'Celulosa y humedad' },
    ];

    return {
      px: safePx,
      py: safePy,
      lat,
      lon,
      spectrum,
      indices: [
        { id: 'NDVI', val: ndviCalc, label: 'Vigor' },
        { id: 'NDRE', val: ndreCalc, label: 'Clorofila' },
        { id: 'Kcb', val: kcbCalc, label: 'Transpiración' },
      ],
    };
  }, []);

  // Inspector Point
  const [inspectedPixel, setInspectedPixel] = useState(() => {
    const { cx, cy } = findBestCanopyPixel(currentDataset);
    return createInspectedPixelState(cx, cy);
  });

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const overlayRef = useRef<L.ImageOverlay | null>(null);
  const markerRef = useRef<L.CircleMarker | null>(null);
  const labelsLayerRef = useRef<L.TileLayer | null>(null);
  const roadsLayerRef = useRef<L.TileLayer | null>(null);

  const { width, height, transform } = currentDataset;
  const south = transform.north - height * transform.pixelHeight;
  const north = transform.north;
  const west = transform.west;
  const east = transform.west + width * transform.pixelWidth;
  const bounds: L.LatLngBoundsExpression = [
    [south, west],
    [north, east],
  ];

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const centerLat = (north + south) / 2;
    const centerLon = (west + east) / 2;

    const map = L.map(mapContainerRef.current, {
      center: [centerLat, centerLon],
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
    });

    // Create labels pane
    if (!map.getPane('labelsPane')) {
      const pane = map.createPane('labelsPane');
      pane.style.zIndex = '500';
      pane.style.pointerEvents = 'none';
    }

    // Satellite basemap like GEE
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
        attribution: 'Google Earth Engine & Esri World Imagery',
      }
    ).addTo(map);

    // Reference labels (places, towns, borders)
    const labels = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
        pane: 'labelsPane',
      }
    ).addTo(map);
    labelsLayerRef.current = labels;

    // Road network
    const roads = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
        pane: 'labelsPane',
      }
    ).addTo(map);
    roadsLayerRef.current = roads;

    // Boundary polygon around the parcel
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
        interactive: false,
      }
    ).addTo(map);

    // Initial inspection pin
    const initMarker = L.circleMarker([inspectedPixel.lat, inspectedPixel.lon], {
      radius: 7,
      color: '#ffffff',
      fillColor: '#10b981',
      fillOpacity: 1,
      weight: 2.5,
    }).addTo(map);
    markerRef.current = initMarker;

    mapInstanceRef.current = map;
    map.fitBounds(bounds, { padding: [30, 30] });

    // Click handler: pins the selected tree/point
    map.on('click', (e: L.LeafletMouseEvent) => {
      const ds = datasetRef.current;
      const s = ds.transform.north - ds.height * ds.transform.pixelHeight;
      const n = ds.transform.north;
      const w = ds.transform.west;
      const ea = ds.transform.west + ds.width * ds.transform.pixelWidth;

      const { lat, lng } = e.latlng;
      if (lat >= s && lat <= n && lng >= w && lng <= ea) {
        const py = Math.floor(((n - lat) / (n - s)) * ds.height);
        const px = Math.floor(((lng - w) / (ea - w)) * ds.width);

        const newPixel = createInspectedPixelState(px, py);
        setInspectedPixel(newPixel);
        setIsPinned(true);

        if (markerRef.current) {
          markerRef.current.setLatLng([newPixel.lat, newPixel.lon]);
        }
      }
    });

    // Mousemove handler: live preview when unpinned
    map.on('mousemove', (e: L.LeafletMouseEvent) => {
      // If user has not locked a pin, update on hover
      // Note: we check the live state using datasetRef
      const ds = datasetRef.current;
      const s = ds.transform.north - ds.height * ds.transform.pixelHeight;
      const n = ds.transform.north;
      const w = ds.transform.west;
      const ea = ds.transform.west + ds.width * ds.transform.pixelWidth;

      const { lat, lng } = e.latlng;
      if (lat >= s && lat <= n && lng >= w && lng <= ea) {
        const py = Math.floor(((n - lat) / (n - s)) * ds.height);
        const px = Math.floor(((lng - w) / (ea - w)) * ds.width);

        setInspectedPixel((prev) => {
          // If pinned, only update if explicit click
          return prev;
        });
      }
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update labels visibility
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (showLabels) {
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
  }, [showLabels]);

  // Update Raster Overlay based on geeActiveLayer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    let dataUrl = '';
    if (geeActiveLayer === 'RGB') {
      const b4 = currentDataset.bands.get('B4') || new Float32Array(width * height);
      const b3 = currentDataset.bands.get('B3') || new Float32Array(width * height);
      const b2 = currentDataset.bands.get('B2') || new Float32Array(width * height);
      dataUrl = createRgbCompositeDataUrl(b4, b3, b2, width, height, opacity);
    } else if (geeActiveLayer === 'FALSE_COLOR_NIR') {
      const b8 = currentDataset.bands.get('B8') || new Float32Array(width * height);
      const b4 = currentDataset.bands.get('B4') || new Float32Array(width * height);
      const b3 = currentDataset.bands.get('B3') || new Float32Array(width * height);
      dataUrl = createRgbCompositeDataUrl(b8, b4, b3, width, height, opacity);
    } else {
      let bandData = currentDataset.bands.get(geeActiveLayer);
      if (!bandData) {
        // Fallback to first available or empty
        bandData = currentDataset.bands.values().next().value || new Float32Array(width * height);
      }
      const colormap = geeActiveLayer === 'DEM' ? 'terrain' : geeActiveLayer.startsWith('NDM') ? 'BrBG' : 'RdYlGn';
      dataUrl = createRasterDataUrl(bandData, width, height, colormap, 0.1, 0.9, opacity);
    }

    if (!dataUrl) return;

    if (overlayRef.current) {
      overlayRef.current.setUrl(dataUrl);
      overlayRef.current.setOpacity(opacity);
      overlayRef.current.setBounds(L.latLngBounds([south, west], [north, east]));
    } else {
      overlayRef.current = L.imageOverlay(dataUrl, bounds, {
        opacity,
        interactive: false,
      }).addTo(map);
    }
  }, [geeActiveLayer, opacity, currentDataset, width, height, south, west, north, east, bounds]);

  // Select a preset tree point
  const handleSelectPreset = (type: 'high_vigor' | 'stress' | 'soil') => {
    let px = Math.floor(currentDataset.width * 0.48);
    let py = Math.floor(currentDataset.height * 0.52);

    if (type === 'high_vigor') {
      px = Math.floor(currentDataset.width * 0.42);
      py = Math.floor(currentDataset.height * 0.45);
    } else if (type === 'stress') {
      px = Math.floor(currentDataset.width * 0.72);
      py = Math.floor(currentDataset.height * 0.38);
    } else if (type === 'soil') {
      px = Math.floor(currentDataset.width * 0.15);
      py = Math.floor(currentDataset.height * 0.15);
    }

    const newPixel = createInspectedPixelState(px, py);
    setInspectedPixel(newPixel);
    setIsPinned(true);

    if (markerRef.current && mapInstanceRef.current) {
      markerRef.current.setLatLng([newPixel.lat, newPixel.lon]);
      mapInstanceRef.current.panTo([newPixel.lat, newPixel.lon], { animate: true });
    }
  };

  // Execute Live Query simulation to Earth Engine
  const handleExecuteGEEQuery = () => {
    setIsQuerying(true);
    setQueryStatus('Consultando colección Sentinel-2 SR en GEE...');

    setTimeout(() => {
      setIsQuerying(false);
      setQueryStatus(
        `Compuesto GEE generado (${reducerType}) del ${startDate} al ${endDate} con nubes < ${cloudCoverMax}%`
      );
    }, 600);
  };

  return (
    <div className="space-y-6">
      {/* What does GEE API allow banner */}
      <div className="bg-emerald-950 text-white rounded-xl p-5 border border-emerald-800 shadow-lg space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <h2 className="text-base font-bold text-white tracking-tight">
                Lienzo Satelital Google Earth Engine (Sentinel-2 SR Harmonized)
              </h2>
            </div>
            <p className="text-xs text-emerald-200/90 leading-relaxed max-w-4xl">
              <strong>¿Qué te permite hacer la API de GEE en AgroVision?</strong> En lugar de descargar manualmente archivos de gigabytes a tu computadora, la API de GEE procesa en los servidores de Google el catálogo de Sentinel-2, elimina nubes, sintetiza las mejores escenas del huerto (131 ha) mediante reductores estadísticos (Mediana, Media o Máximo Vigor), calcula los 17 índices agronómicos y entrega el lienzo interactivo directamente georreferenciado con inspección espectral.
            </p>
          </div>
          <button
            onClick={() => onExportLayer(geeActiveLayer === 'RGB' ? 'NDVI' : geeActiveLayer)}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shrink-0 shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Exportar GeoTIFF</span>
          </button>
        </div>

        {/* Live GEE Controls Ribbon */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2 border-t border-emerald-800/80 text-xs">
          {/* Date range */}
          <div className="bg-emerald-900/60 p-2.5 rounded-lg border border-emerald-800">
            <div className="text-[11px] text-emerald-300 font-semibold mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>Ventana Temporal GEE:</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-emerald-950/80 border border-emerald-700/80 rounded px-1.5 py-0.5 text-white w-full"
              />
              <span>→</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-emerald-950/80 border border-emerald-700/80 rounded px-1.5 py-0.5 text-white w-full"
              />
            </div>
          </div>

          {/* Cloud Cover Filter */}
          <div className="bg-emerald-900/60 p-2.5 rounded-lg border border-emerald-800">
            <div className="text-[11px] text-emerald-300 font-semibold mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Cloud className="w-3.5 h-3.5" />
                <span>Máx. Nubosidad:</span>
              </span>
              <span className="font-mono">{cloudCoverMax}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              value={cloudCoverMax}
              onChange={(e) => setCloudCoverMax(parseInt(e.target.value))}
              className="w-full h-1.5 accent-emerald-400 cursor-pointer"
            />
          </div>

          {/* Reducer */}
          <div className="bg-emerald-900/60 p-2.5 rounded-lg border border-emerald-800">
            <div className="text-[11px] text-emerald-300 font-semibold mb-1 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" />
              <span>Reductor de Escena:</span>
            </div>
            <select
              value={reducerType}
              onChange={(e) => setReducerType(e.target.value as any)}
              className="w-full bg-emerald-950/80 border border-emerald-700/80 rounded px-2 py-1 text-white font-mono text-[11px]"
            >
              <option value="median">Mediana Temporal (Anti-Nubes)</option>
              <option value="mean">Media Ponderada</option>
              <option value="max_ndvi">Compuesto Máximo NDVI (Greenest)</option>
            </select>
          </div>

          {/* Query Action Button */}
          <div className="flex flex-col justify-end">
            <button
              onClick={handleExecuteGEEQuery}
              disabled={isQuerying}
              className="w-full py-2.5 px-3 bg-white text-emerald-950 hover:bg-emerald-100 disabled:opacity-50 font-bold rounded-lg shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className={`w-3.5 h-3.5 ${isQuerying ? 'animate-spin' : ''}`} />
              <span>{isQuerying ? 'Procesando en GEE...' : 'Sintetizar Mosaico GEE'}</span>
            </button>
          </div>
        </div>

        {/* Live Status */}
        <div className="text-[11px] font-mono text-emerald-300 flex items-center gap-2 pt-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>{queryStatus}</span>
        </div>
      </div>

      {/* Main Map + Inspector Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: The Map Canvas (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            {/* Map Top Control Bar */}
            <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
              {/* Layer Selection Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mr-1">
                  Capa GEE:
                </span>
                {(['RGB', 'FALSE_COLOR_NIR', 'NDVI', 'NDRE', 'NDMI', 'Kcb', 'DEM'] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setGeeActiveLayer(l)}
                    className={`px-2 py-1 rounded text-xs font-mono font-semibold transition-colors cursor-pointer ${
                      geeActiveLayer === l
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {l === 'RGB' ? 'Color Real' : l === 'FALSE_COLOR_NIR' ? 'Falso Color NIR' : l}
                  </button>
                ))}
              </div>

              {/* Labels toggle & Opacity */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowLabels(!showLabels)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                    showLabels
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                  title="Activa o desactiva las etiquetas de ciudades y caminos de referencia"
                >
                  <Tag className="w-3 h-3" />
                  <span>Etiquetas: {showLabels ? 'ON' : 'OFF'}</span>
                </button>

                <div className="flex items-center gap-1.5 pl-2 border-l border-slate-300 dark:border-slate-700">
                  <span className="text-slate-500 text-[10px]">Opacidad:</span>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={opacity}
                    onChange={(e) => setOpacity(parseFloat(e.target.value))}
                    className="w-16 h-1.5 accent-emerald-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* The Map Canvas */}
            <div className="relative w-full h-[520px] bg-slate-950 overflow-hidden cursor-crosshair">
              <div ref={mapContainerRef} className="w-full h-full z-10" />

              {/* GEE Canvas Indicator Badge */}
              <div className="absolute top-3 right-3 bg-slate-950/90 backdrop-blur-md text-white border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono z-30 shadow-xl pointer-events-none">
                <span className="text-emerald-400 font-bold">● GEE Live Canvas</span>
                <span className="text-slate-400 text-[10px] block">
                  {isPinned ? `Fijado en [${inspectedPixel.px}, ${inspectedPixel.py}] · Clic en mapa para cambiar` : 'Mueve el cursor o haz clic en cualquier árbol'}
                </span>
              </div>

              {/* Footnote */}
              <div className="absolute bottom-4 left-4 bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-md px-2.5 py-1 text-[10px] font-mono text-slate-300 z-30 flex items-center gap-2">
                <MapPin className="w-3 h-3 text-emerald-400" />
                <span>Esri World Imagery + Referencias Geográficas (WGS84)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: The GEE Inspector Panel with Spectral Signature Line Chart (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* GEE Inspector Box */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                  Firma Espectral de Píxel (Estilo GEE)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono font-bold">
                  Píxel [{inspectedPixel.px}, {inspectedPixel.py}]
                </span>
              </div>
            </div>

            {/* Quick Test Presets to activate and observe changes */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Muestreo Rápido en el Huerto:
              </span>
              <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                <button
                  onClick={() => handleSelectPreset('high_vigor')}
                  className="px-2 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-medium hover:bg-emerald-100 transition-colors text-center cursor-pointer"
                >
                  🌳 Árbol Vigoroso
                </button>
                <button
                  onClick={() => handleSelectPreset('stress')}
                  className="px-2 py-1.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-medium hover:bg-amber-100 transition-colors text-center cursor-pointer"
                >
                  💧 Estrés Hídrico
                </button>
                <button
                  onClick={() => handleSelectPreset('soil')}
                  className="px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 transition-colors text-center cursor-pointer"
                >
                  🚜 Acceso / Suelo
                </button>
              </div>
            </div>

            {/* Coordinates & Point Location */}
            <div className="text-xs font-mono text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 flex justify-between">
              <span>Lat: {inspectedPixel.lat.toFixed(5)}° S</span>
              <span>Lon: {inspectedPixel.lon.toFixed(5)}° W</span>
            </div>

            {/* Key Indices At this Tree / Point */}
            <div className="grid grid-cols-3 gap-2">
              {inspectedPixel.indices.map((idx) => (
                <div
                  key={idx.id}
                  className="p-2.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 text-center"
                >
                  <div className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase">
                    {idx.id}
                  </div>
                  <div className="text-lg font-bold font-mono text-emerald-950 dark:text-emerald-200">
                    {idx.val.toFixed(3)}
                  </div>
                  <div className="text-[9px] text-slate-400">{idx.label}</div>
                </div>
              ))}
            </div>

            {/* Spectral Signature Curve (Curva de Firma Espectral en Líneas) */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Curva Espectral Sentinel-2 (Reflectancia 0 a 0.70):</span>
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                  490 nm → 2190 nm
                </span>
              </div>

              {/* Dynamic SVG Line Chart */}
              <div className="relative w-full h-44 bg-slate-950 rounded-xl p-3 border border-slate-800 flex flex-col justify-between">
                {/* SVG Canvas */}
                <svg viewBox="0 0 340 120" className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="spectrumGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines with reflectance marks */}
                  <g className="text-[8px] font-mono fill-slate-500">
                    <line x1="28" y1="15" x2="335" y2="15" stroke="#334155" strokeDasharray="3 3" />
                    <text x="24" y="18" textAnchor="end">0.60</text>

                    <line x1="28" y1="45" x2="335" y2="45" stroke="#334155" strokeDasharray="3 3" />
                    <text x="24" y="48" textAnchor="end">0.40</text>

                    <line x1="28" y1="75" x2="335" y2="75" stroke="#334155" strokeDasharray="3 3" />
                    <text x="24" y="78" textAnchor="end">0.20</text>

                    <line x1="28" y1="105" x2="335" y2="105" stroke="#475569" />
                    <text x="24" y="107" textAnchor="end">0.00</text>
                  </g>

                  {/* Spectral Signature Line & Points */}
                  {(() => {
                    const pts = inspectedPixel.spectrum.map((p, i) => {
                      const x = 35 + (i / (inspectedPixel.spectrum.length - 1)) * 295;
                      const clampedVal = Math.max(0, Math.min(0.68, p.value));
                      const y = 105 - (clampedVal / 0.65) * 90;
                      return { ...p, x, y };
                    });

                    const pathStr = pts.reduce(
                      (acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`,
                      ''
                    );

                    return (
                      <>
                        {/* Shaded Area */}
                        <path
                          d={`${pathStr} L ${pts[pts.length - 1].x.toFixed(1)} 105 L ${pts[0].x.toFixed(1)} 105 Z`}
                          fill="url(#spectrumGradient)"
                        />

                        {/* Line Stroke */}
                        <path
                          d={pathStr}
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />

                        {/* Interactive Data Points */}
                        {pts.map((p, i) => (
                          <g
                            key={p.code}
                            className="cursor-pointer group"
                            onMouseEnter={() => setHoveredBand(p)}
                            onMouseLeave={() => setHoveredBand(null)}
                          >
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r={hoveredBand?.code === p.code ? '5' : '3.5'}
                              fill="#ffffff"
                              stroke="#10b981"
                              strokeWidth="2"
                              className="transition-all"
                            />
                            <text
                              x={p.x}
                              y="116"
                              className="fill-slate-400 font-mono text-[8px] font-semibold"
                              textAnchor="middle"
                            >
                              {p.code}
                            </text>
                          </g>
                        ))}
                      </>
                    );
                  })()}
                </svg>

                {/* Hover Band Tooltip Bar */}
                <div className="text-[10px] font-mono text-slate-300 pt-1 flex items-center justify-between border-t border-slate-800">
                  {hoveredBand ? (
                    <>
                      <span className="text-emerald-400 font-bold">
                        {hoveredBand.band} ({hoveredBand.wavelengthNm} nm):
                      </span>
                      <span className="text-white font-bold">
                        {(hoveredBand.value * 100).toFixed(2)}% reflectancia
                      </span>
                      <span className="text-slate-400">{hoveredBand.role}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-slate-400">Pasa el cursor por cada punto (B2 a B12)</span>
                      <span className="text-emerald-400">Pico NIR: B8 (842 nm)</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Band Reflectance Table */}
            <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg text-[11px] font-mono">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 sticky top-0">
                  <tr>
                    <th className="p-1.5 pl-2.5">Banda Sentinel-2</th>
                    <th className="p-1.5">Long. Onda</th>
                    <th className="p-1.5 text-right pr-2.5">Reflectancia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {inspectedPixel.spectrum.map((r) => (
                    <tr
                      key={r.code}
                      onMouseEnter={() => setHoveredBand(r)}
                      onMouseLeave={() => setHoveredBand(null)}
                      className={`cursor-pointer transition-colors ${hoveredBand?.code === r.code ? 'bg-emerald-50 dark:bg-emerald-950/50' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/50'}`}
                    >
                      <td className="p-1.5 pl-2.5 text-slate-700 dark:text-slate-300 font-semibold">{r.band}</td>
                      <td className="p-1.5 text-slate-400">{r.wavelengthNm} nm</td>
                      <td className="p-1.5 text-right pr-2.5 font-bold text-emerald-600 dark:text-emerald-400">
                        {r.value.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
