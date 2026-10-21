[README.md](https://github.com/user-attachments/files/33789084/README.md)
# AgroVision — Visor GeoTIFF Sentinel-2 y Análisis Multitemporal de Índices

[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.x-purple.svg)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8.svg)](https://tailwindcss.com/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9-green.svg)](https://leafletjs.com/)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-yellow.svg)](LICENSE)

Plataforma agronómica y visor geoespacial de alta precisión para el procesamiento, visualización, diagnóstico espectral y análisis comparativo multitemporal de imágenes satelitales **Sentinel-2 Surface Reflectance (SR Harmonized)** y exportaciones de **Google Earth Engine (GEE)**.

Diseñado especialmente para la monitorización de huertos frutales y cultivos de alta densidad (caso de estudio: **131 hectáreas de avellano europeo *Corylus avellana*** en la Región del Maule, Chile, resolución espacial ≈ 8,1 × 9,9 m/píxel).

---

## 🌟 Características Principales

### 1. Módulo de Reconocimiento y Cálculo Automático de Bandas
* **Detección inteligente de metadatos:** Reconoce automáticamente las bandas exportadas desde GEE o QGIS, tolerando prefijos de fecha (`20251101_B8`) o sufijos estadísticos (`NDVI_mean`).
* **Auto-reescalado radiométrico:** Detecta si los valores de reflectancia vienen en enteros L2A estándar (0–10.000) o en reflectancia de superficie flotante (0,0–1,0), dividiendo por 10.000 de forma automática.
* **Catálogo de 17 Índices Agronómicos:**
  * **Vigor y Biomasa:** NDVI, GNDVI, EVI, SAVI, OSAVI, MSAVI2, ARVI.
  * **Clorofila y Nutrición Foliar:** NDRE (RedEdge), GCL, ReCL, N_Indicator.
  * **Humedad y Estrés Hídrico:** NDMI, NDWI, S2_PRI (Índice de Reflectancia Fotoquímica).
  * **Topografía y Demanda Hídrica:** DEM (Elevación), Slope (Pendiente), Kcb (Coeficiente de cultivo basal FAO-56).
* **Fórmulas Personalizadas (`FORMULAS_USUARIO`):** Permite ingresar fórmulas matemáticas propias sobre reflectancias (`B2..B12`).
* **Manejo de Casos Límite:**
  * Soporte para selección forzada de bandas (`BANDA_MANUAL`).
  * Diálogo para orden manual si el TIFF carece de nombres (`ORDEN_BANDAS`).

---

### 2. Visor de Comparativa Temporal Interanual
* **Contraste de Temporadas:** Compara el archivo cargado en el visor contra campañas históricas (p. ej. *2023–2024 fase juvenil*, *2024–2025 desarrollo*, *2025–2026 actual* o un segundo GeoTIFF subido).
* **3 Modos de Visualización:**
  1. **Cortinilla Deslizante (Swipe):** Divisor vertical interactivo a 60 fps mediante `clip-path` para examinar el antes y después sobre la ortofoto satelital.
  2. **Lado a Lado (Dual Side-by-Side):** Dos lienzos satelitales sincronizados en paneo y zoom.
  3. **Mapa de Cambio Diferencial ($\Delta = B - A$):** Mapa temático clasificado que cuantifica hectáreas y porcentaje de superficie en 5 categorías:
     * *Ganancia Alta (> +0.10)*
     * *Ganancia Moderada (+0.03 a +0.10)*
     * *Estable (±0.03)*
     * *Declive Leve (-0.03 a -0.10)*
     * *Declive Severo (< -0.10)*
* **Tendencia Multianual:** Gráfico de evolución temporal del promedio zonal, desviación estándar y percentiles.

---

### 3. Lienzo Satelital GEE en Vivo & Firma Espectral
* **Lienzo Satelital con Referencias:** Capa base satelital de alta resolución (*Esri World Imagery*) combinada con etiquetas de rutas, caminos y ciudades (*Esri Boundaries & Places*) para orientación en terreno.
* **Firma Espectral de 10 Bandas (Curva 490 nm a 2190 nm):**
  * Gráfico vectorial dinámico que muestra la respuesta fisiológica de cada árbol en B2 (Azul), B3 (Verde), B4 (Rojo), B5-B6-B7 (Red-Edge), B8-B8A (NIR) y B11-B12 (SWIR).
  * Tooltips interactivos con longitudes de onda en nanómetros y diagnóstico fisiológico (absorción fotosintética, salto de borde rojo, meseta celular del mesófilo y absorción hídrica).
  * Modos de inspección por clic fijado o seguimiento al mover el cursor.
  * Presets de muestreo rápido: *Árbol Vigoroso*, *Estrés Hídrico*, *Suelo/Acceso*.
* **Compuestos Satelitales:** Alternador rápido entre *Color Verdadero (RGB 4-3-2)*, *Falso Color Infrarrojo (NIR 8-4-3)* e índices procesados.

---

### 4. Arquitectura de Cómputo Híbrido & Gestión de EECU
* **Motor Raster Cliente en Memoria (0.00 EECU / $0.00 Costo):**
  * Decodificación local de archivos GeoTIFF en el navegador usando `geotiff.js`, TypedArrays de JavaScript y shaders de visualización WebGL.
  * Cero consumo de cuota de Google Cloud Platform y privacidad total: los datos del huerto nunca salen del navegador.
* **Integración con API de Google Earth Engine:**
  * Traductor de scripts de inicialización interactiva de Python (`ee.Authenticate()`, `ee.Initialize()`) a JavaScript estándar para la API cliente de GEE.
  * Panel explicativo de métricas de costo y consumo de EECU (Earth Engine Compute Unit).

---

### 5. Exportación GeoTIFF Monocanal para QGIS / ArcGIS
* Genera y descarga en 1 clic un archivo GeoTIFF monocanal Float32 que conserva la georreferenciación completa (matriz de transformación afín, resolución por píxel y coordenadas WGS84 EPSG:4326) listo para abrir en **QGIS**, **ArcGIS** o maquinaria agrícola con dosis variable (VRA).

---

## 🚀 Instalación y Puesta en Marcha Local

### Prerrequisitos
* [Node.js](https://nodejs.org/) (versión 18 o superior recomendada)
* `npm` o `yarn`

### Pasos
1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/TU_USUARIO/agrovision-sentinel2.git
   cd agrovision-sentinel2
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Iniciar servidor de desarrollo:**
   ```bash
   npm run dev
   ```
   Abre [http://localhost:3000](http://localhost:3000) (o el puerto indicado en la consola) en tu navegador.

4. **Compilar para producción:**
   ```bash
   npm run build
   ```

---

## 📂 Estructura del Proyecto

```
├── index.html                   # Entry point HTML con fuentes y estilos Leaflet
├── package.json                 # Dependencias y scripts
├── tsconfig.json                # Configuración de TypeScript
├── vite.config.ts               # Configuración del bundler Vite con Tailwind v4
├── src/
│   ├── main.tsx                 # Montaje de la aplicación React
│   ├── App.tsx                  # Controlador principal de estado, dataset y vistas
│   ├── index.css                # Estilos globales y directivas Tailwind CSS
│   ├── types/
│   │   └── geotiff.ts           # Interfaces TypeScript (GeoRasterData, GeoTransform, etc.)
│   ├── components/
│   │   ├── Header.tsx           # Barra superior con navegación de vistas y acceso a GEE
│   │   ├── IndexSelector.tsx    # Menú desplegable y selector de los 17 índices
│   │   ├── RasterMap.tsx        # Visor de mapa Leaflet con paletas de color y capas base
│   │   ├── StatisticsPanel.tsx  # Métricas estadísticas del lote (media, desv, percentiles)
│   │   ├── HistogramChart.tsx   # Histograma de distribución de frecuencias del índice
│   │   ├── ComparativeAnalysisView.tsx # Visor de comparativa temporal (Swipe, Δ, Side-by-Side)
│   │   ├── GEEInteractiveCanvas.tsx    # Lienzo GEE en vivo con curva espectral B2-B12
│   │   ├── GEEApiModal.tsx      # Modal de conexión GEE y gestión de EECUs
│   │   ├── BandTableModal.tsx   # Tabla de reconocimiento de bandas del GeoTIFF
│   │   ├── CustomFormulaModal.tsx # Editor interactivo de fórmulas del usuario
│   │   ├── ExportModal.tsx      # Generador y descargador de GeoTIFF para QGIS
│   │   └── UploadModal.tsx      # Diálogo de carga de archivos GeoTIFF locales
│   └── utils/
│       ├── colormaps.ts         # Generador de paletas de color (RdYlGn, terrain, magma, BrBG)
│       ├── comparativeAnalysis.ts # Algoritmos de cálculo diferencial y series temporales
│       ├── defaultDataset.ts    # Generador del huerto sintético base (131 ha, Maule)
│       ├── formulas.ts          # Fórmulas canónicas y cálculo desde reflectancias
│       ├── geeApi.ts            # Utilidades de integración y traducción JS de GEE
│       ├── geotiffParser.ts     # Decodificador de archivos GeoTIFF multiespectrales
│       ├── rasterToCanvas.ts    # Renderizado acelerado de arrays raster a DataURL
│       └── statistics.ts        # Cálculo estadístico zonal y de percentiles
```

---

## 🌿 Catálogo de Índices Implementados

| Índice | Nombre | Fórmula / Fuente | Aplicación Principal |
| :--- | :--- | :--- | :--- |
| **NDVI** | Normalized Difference Vegetation Index | $(B8 - B4) / (B8 + B4)$ | Vigor fotosintético general y biomasa |
| **GNDVI** | Green NDVI | $(B8 - B3) / (B8 + B3)$ | Detección de clorofila en dosel cerrado |
| **EVI** | Enhanced Vegetation Index | $2.5 \times (B8 - B4) / (B8 + 6B4 - 7.5B2 + 1)$ | Corrige saturación y fondo del suelo |
| **SAVI** | Soil-Adjusted Vegetation Index | $1.5 \times (B8 - B4) / (B8 + B4 + 0.5)$ | Huertos con suelo descubierto inter-hilera |
| **OSAVI** | Optimized SAVI | $(B8 - B4) / (B8 + B4 + 0.16)$ | Frutales y avellanos en etapa juvenil |
| **NDRE** | Normalized Difference Red Edge | $(B8 - B5) / (B8 + B5)$ | Estado nutricional de nitrógeno |
| **GCL** | Green Chlorophyll Index | $(B8 / B3) - 1$ | Estimación directa de clorofila foliar |
| **ReCL** | Red-Edge Chlorophyll Index | $(B8 / B5) - 1$ | Clorofila en etapas avanzadas de copa |
| **ARVI** | Atmospherically Resistant Veg. Index | $(B8 - (2B4 - B2)) / (B8 + (2B4 - B2))$ | Corrige aerosoles y bruma atmosférica |
| **MSAVI2** | Modified Soil-Adjusted Veg. Index 2 | $(2B8 + 1 - \sqrt{(2B8 + 1)^2 - 8(B8 - B4)}) / 2$ | Etapas iniciales de plantación |
| **S2_PRI** | Photochemical Reflectance Index | $(B3 - B5) / (B3 + B5)$ | Eficiencia en el uso de la radiación |
| **NDMI** | Normalized Difference Moisture Index | $(B8 - B11) / (B8 + B11)$ | Contenido relativo de agua en el follaje |
| **NDWI** | Normalized Difference Water Index | $(B3 - B8) / (B3 + B8)$ | Detección de agua y zonas anegadas |
| **DEM** | Digital Elevation Model | Banda leída del archivo | Análisis de altimetría y drenaje |
| **Slope** | Pendiente del Terreno | Banda leída del archivo | Riesgo de escorrentía y exposición solar |
| **Kcb** | Coeficiente Basal de Cultivo FAO-56 | Calculado o leído | Programación y demanda de riego por goteo |
| **N_Indicator** | Indicador de Nitrógeno | Banda leída del archivo | Diagnóstico de nutrición nitrogenada |

---

## 🐍 Equivalente en Python (Google Colab / Jupyter)

El núcleo algorítmico de este visor puede ejecutarse también como celda de código independiente en **Google Colab** o entornos con `rasterio` y `matplotlib`:

```python
import rasterio
import numpy as np
import matplotlib.pyplot as plt

# Cargar GeoTIFF multiespectral
with rasterio.open("AvellsFlor_nov25ene26.tif") as src:
    # Si las reflectancias vienen multiplicadas por 10.000:
    b4 = src.read(3).astype(np.float32) / 10000.0  # Banda B4 (Rojo)
    b8 = src.read(7).astype(np.float32) / 10000.0  # Banda B8 (NIR)
    
    # Calcular NDVI ignorando zonas NoData
    ndvi = np.where((b8 + b4) > 0, (b8 - b4) / (b8 + b4), np.nan)
    
    # Visualizar mapa temático
    plt.figure(figsize=(10, 8))
    plt.imshow(ndvi, cmap="RdYlGn", vmin=0.1, vmax=0.9)
    plt.colorbar(label="NDVI")
    plt.title("Huerto Avellanos (131 ha) — NDVI Sentinel-2")
    plt.axis("off")
    plt.show()
```

---

## 📄 Licencia

Este proyecto está bajo la Licencia **Apache 2.0**. Consulta el archivo `LICENSE` para más detalles.
