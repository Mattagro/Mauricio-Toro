import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import L from 'leaflet';
import { Layers, ZoomIn, ZoomOut, RotateCcw, Crosshair, Map as MapIcon, Sliders } from 'lucide-react';
import { GeoTransform, LayerStatistics, ColorStretchMode } from '../types/geotiff';
import { createRasterDataUrl } from '../utils/rasterToCanvas';
import { getColormapCSSGradient } from '../utils/colormaps';

interface RasterMapProps {
  data: Float32Array;
  width: number;
  height: number;
  transform: GeoTransform;
  statistics: LayerStatistics;
  layerId: string;
  colormapName: string;
  unit?: string;
  sourceDescription: string;
  stretchMode: ColorStretchMode;
  onChangeStretchMode: (mode: ColorStretchMode) => void;
}

export const RasterMap: React.FC<RasterMapProps> = ({
  data,
  width,
  height,
  transform,
  statistics,
  layerId,
  colormapName,
  unit,
  sourceDescription,
  stretchMode,
  onChangeStretchMode,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const overlayLayerRef = useRef<L.ImageOverlay | null>(null);
  const baseTilesRef = useRef<L.TileLayer | null>(null);
  const boundaryPolyRef = useRef<L.Polygon | null>(null);

  // Map settings
  const [opacity, setOpacity] = useState<number>(0.75); // 75% default lets satellite peek through
  const [basemapType, setBasemapType] = useState<'satellite' | 'hybrid' | 'streets'>('hybrid');

  // Hover & click state
  const [hoverInfo, setHoverInfo] = useState<{
    pixelX: number;
    pixelY: number;
    val: number;
    lat: number;
    lon: number;
  } | null>(null);

  // Calculate stretch range based on mode
  const vmin = stretchMode === 'p2_p98' ? statistics.p2 : statistics.min;
  const vmax = stretchMode === 'p2_p98' ? statistics.p98 : statistics.max;

  // Geographic bounds
  const south = transform.north - height * transform.pixelHeight;
  const north = transform.north;
  const west = transform.west;
  const east = transform.west + width * transform.pixelWidth;
  const bounds: L.LatLngBoundsExpression = [
    [south, west],
    [north, east],
  ];

  // Tile layer URL by type
  const tileConfig = useMemo(() => {
    switch (basemapType) {
      case 'satellite':
        return {
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          attribution: 'Esri, Maxar, Earthstar Geographics, USDA, USGS',
          maxZoom: 19,
        };
      case 'hybrid':
        return {
          url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
          attribution: 'Google Hybrid Satelital',
          maxZoom: 20,
        };
      case 'streets':
        return {
          url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        };
    }
  }, [basemapType]);

  // Initialize Leaflet Map
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

    // Add satellite base tiles
    const baseTiles = L.tileLayer(tileConfig.url, {
      maxZoom: tileConfig.maxZoom,
      attribution: tileConfig.attribution,
    }).addTo(map);

    baseTilesRef.current = baseTiles;
    mapInstanceRef.current = map;

    // Add polygon boundary outline around the 131 ha lot
    const boundaryPoly = L.polygon(
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
        dashArray: '4 4',
      }
    ).addTo(map);
    boundaryPolyRef.current = boundaryPoly;

    // Fit to bounds initially
    map.fitBounds(bounds, { padding: [25, 25] });

    // Handle mouse movement over map to inspect pixels
    map.on('mousemove', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      if (lat >= south && lat <= north && lng >= west && lng <= east) {
        const py = Math.floor(((north - lat) / (north - south)) * height);
        const px = Math.floor(((lng - west) / (east - west)) * width);

        if (px >= 0 && px < width && py >= 0 && py < height) {
          const idx = py * width + px;
          const val = data[idx];
          setHoverInfo({
            pixelX: px,
            pixelY: py,
            val,
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

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update base tiles on type change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (baseTilesRef.current) {
      map.removeLayer(baseTilesRef.current);
    }

    const newTiles = L.tileLayer(tileConfig.url, {
      maxZoom: tileConfig.maxZoom,
      attribution: tileConfig.attribution,
    }).addTo(map);

    baseTilesRef.current = newTiles;

    // Ensure overlay remains on top of tiles
    if (overlayLayerRef.current) {
      overlayLayerRef.current.bringToFront();
    }
  }, [tileConfig]);

  // Generate raster DataURL and update Leaflet ImageOverlay
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const dataUrl = createRasterDataUrl(data, width, height, colormapName, vmin, vmax, 1.0);
    if (!dataUrl) return;

    if (overlayLayerRef.current) {
      overlayLayerRef.current.setUrl(dataUrl);
      overlayLayerRef.current.setOpacity(opacity);
      overlayLayerRef.current.setBounds(L.latLngBounds([south, west], [north, east]));
    } else {
      const overlay = L.imageOverlay(dataUrl, bounds, {
        opacity,
        interactive: false,
      }).addTo(map);
      overlayLayerRef.current = overlay;
    }
  }, [data, width, height, colormapName, vmin, vmax, opacity, north, south, east, west]);

  // Update opacity dynamically
  useEffect(() => {
    if (overlayLayerRef.current) {
      overlayLayerRef.current.setOpacity(opacity);
    }
  }, [opacity]);

  const handleResetBounds = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [30, 30] });
    }
  };

  const formatCoord = (deg: number, isLat: boolean) => {
    const abs = Math.abs(deg);
    const d = Math.floor(abs);
    const m = Math.floor((abs - d) * 60);
    const s = ((abs - d - m / 60) * 3600).toFixed(1);
    const dir = isLat ? (deg >= 0 ? 'N' : 'S') : (deg >= 0 ? 'E' : 'W');
    return `${d}°${m}'${s}"${dir} (${deg.toFixed(5)}°)`;
  };

  return (
    <div className="relative flex flex-col bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
      {/* Top Map Control Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-100 dark:bg-slate-950/90 border-b border-slate-200 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {layerId}
          </span>
          <span className="text-slate-400">·</span>
          <span className="text-slate-600 dark:text-slate-400 font-mono text-[11px] truncate max-w-[240px]">
            {sourceDescription}
          </span>
        </div>

        {/* Stretch Mode Toggle (P2-P98 vs Min-Max) */}
        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-[11px]">Rango:</span>
          <div className="flex items-center p-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md">
            <button
              onClick={() => onChangeStretchMode('p2_p98')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                stretchMode === 'p2_p98'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
              title="Estiramiento robusto percentiles 2% - 98%"
            >
              P2–P98
            </button>
            <button
              onClick={() => onChangeStretchMode('min_max')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                stretchMode === 'min_max'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
              title="Mínimo a máximo absoluto"
            >
              Mín–Máx
            </button>
          </div>

          {/* Opacity Slider */}
          <div className="flex items-center gap-1.5 ml-1">
            <span className="text-slate-500 text-[11px]">Capa:</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              className="w-16 h-1.5 accent-emerald-600 cursor-pointer"
              title={`Opacidad del índice: ${Math.round(opacity * 100)}% (Desliza a 0% para ver solo el satélite de fondo)`}
            />
            <span className="font-mono text-[10px] text-slate-500 w-7 text-right">
              {Math.round(opacity * 100)}%
            </span>
          </div>

          {/* Basemap Switcher */}
          <div className="flex items-center p-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md ml-1">
            <button
              onClick={() => setBasemapType('satellite')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                basemapType === 'satellite'
                  ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 font-semibold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Satélite
            </button>
            <button
              onClick={() => setBasemapType('hybrid')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                basemapType === 'hybrid'
                  ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 font-semibold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Híbrido
            </button>
            <button
              onClick={() => setBasemapType('streets')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                basemapType === 'streets'
                  ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 font-semibold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Mapa
            </button>
          </div>
        </div>
      </div>

      {/* Main Leaflet Map Viewport */}
      <div className="relative w-full h-[520px] bg-slate-950 overflow-hidden">
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* Floating Coordinates & Pixel Value HUD (On Hover) */}
        {hoverInfo && (
          <div className="absolute top-3 left-3 bg-slate-950/92 backdrop-blur-md text-white border border-slate-700 rounded-lg p-2.5 shadow-2xl pointer-events-none text-xs z-30 font-mono space-y-1 max-w-[280px]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <Crosshair className="w-3.5 h-3.5" />
                <span className="text-[11px] font-semibold text-slate-200">
                  Píxel [{hoverInfo.pixelX}, {hoverInfo.pixelY}]
                </span>
              </div>
              <span className="text-[10px] text-slate-400">Huerto Avellanos</span>
            </div>

            <div className="flex items-baseline justify-between gap-3 pt-0.5">
              <span className="text-slate-400">{layerId}:</span>
              <span className="text-emerald-400 font-bold text-sm">
                {!isNaN(hoverInfo.val)
                  ? `${hoverInfo.val.toFixed(4)} ${unit || ''}`
                  : 'Sin Dato (NoData)'}
              </span>
            </div>

            <div className="text-[10px] text-slate-400 space-y-0.5 pt-0.5 border-t border-slate-800/80">
              <div>Lat: {formatCoord(hoverInfo.lat, true)}</div>
              <div>Lon: {formatCoord(hoverInfo.lon, false)}</div>
            </div>
          </div>
        )}

        {/* Floating Zoom & Bounds Tools */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-lg p-1 shadow-lg z-30">
          <button
            onClick={() => mapInstanceRef.current?.zoomIn()}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Acercar (Zoom In)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => mapInstanceRef.current?.zoomOut()}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Alejar (Zoom Out)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetBounds}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Enfocar Huerto Completo (131 ha)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Basemap Attribution & Resolution Tag */}
        <div className="absolute bottom-4 left-4 bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-md px-2.5 py-1 text-[10px] font-mono text-slate-300 z-30 flex items-center gap-2">
          <span>Fondo: {basemapType === 'satellite' ? 'Satélite Esri World Imagery' : basemapType === 'hybrid' ? 'Google Híbrido' : 'OpenStreetMap'}</span>
          <span className="text-slate-600">|</span>
          <span>Píxel: {transform.pixelWidthMeters.toFixed(1)} × {transform.pixelHeightMeters.toFixed(1)} m</span>
        </div>
      </div>

      {/* Colormap Legend Bar */}
      <div className="p-3 bg-slate-950 border-t border-slate-800/80 flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>Mín: {vmin.toFixed(3)}</span>
          <span className="hidden sm:inline">P5: {statistics.p5.toFixed(3)}</span>
          <span className="text-slate-200 font-semibold">Mediana: {statistics.median.toFixed(3)}</span>
          <span className="hidden sm:inline">P95: {statistics.p95.toFixed(3)}</span>
          <span>Máx: {vmax.toFixed(3)}</span>
        </div>
        <div
          className="h-3 w-full rounded-sm shadow-inner"
          style={{ background: getColormapCSSGradient(colormapName) }}
        />
      </div>
    </div>
  );
};
