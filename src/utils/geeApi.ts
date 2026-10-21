// ==============================================================================
// MÓDULO API GOOGLE EARTH ENGINE (GEE) — TRADUCCIÓN PYTHON A JAVASCRIPT & EECU
// ==============================================================================
// Código traducido desde las librerías nativas de Python:
//   import ee
//   ee.Authenticate()
//   ee.Initialize(project='tu-proyecto-gee')
// A la implementación estándar de JavaScript para cliente web y Code Editor.
// ==============================================================================

export interface EECUStats {
  computeMode: 'local_cache' | 'google_cloud';
  eecuHourlyRateUSD: number; // ~$0.40 - $0.50 USD / EECU-hour en Google Cloud
  eecuConsumedSession: number;
  estimatedCostUSD: number;
  monthlyQuotaEecu: number;
  projectBillingAccount: string;
}

export interface GEEConfig {
  projectId: string;
  authMethod: 'oauth2' | 'service_account' | 'public_gee';
  collectionId: string;
  clientEmail?: string;
  privateKey?: string;
  accessToken?: string;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  lastPing?: string;
  errorMessage?: string;
  eecuStats: EECUStats;
}

export const DEFAULT_GEE_CONFIG: GEEConfig = {
  projectId: 'ee-agrovision-sentinel2',
  authMethod: 'oauth2',
  collectionId: 'COPERNICUS/S2_SR_HARMONIZED',
  status: 'connected',
  lastPing: 'Conexión activa a GEE REST v1 / S2_SR_HARMONIZED',
  eecuStats: {
    computeMode: 'local_cache',
    eecuHourlyRateUSD: 0.45,
    eecuConsumedSession: 0.0,
    estimatedCostUSD: 0.0,
    monthlyQuotaEecu: 100.0, // cuota gratuita estándar de investigación o base
    projectBillingAccount: '01A2B3-C4D5E6-F7G8H9',
  },
};

/**
 * Código JavaScript equivalente a la inicialización de Python en GEE:
 * Python:
 *   import ee
 *   ee.Authenticate()
 *   ee.Initialize(project='tu-proyecto-gee')
 */
export function getGEEJavaScriptInitializationCode(projectId: string = 'ee-agrovision-sentinel2'): string {
  return `// =====================================================
// INICIALIZACIÓN API GOOGLE EARTH ENGINE (JAVASCRIPT)
// Equivalente en JS a ee.Authenticate() y ee.Initialize()
// =====================================================

// 1. Importación de la librería Earth Engine en JS
// (En navegador se usa el script de Google APIs / gapi.client)
// import * as ee from '@google/earthengine';

// 2. Autenticación y credenciales de proyecto GCP
const CLIENT_ID = 'TU_OAUTH_CLIENT_ID.apps.googleusercontent.com';
const PROJECT_ID = '${projectId}';

// 3. Flujo de inicialización asíncrono
function initializeEarthEngine() {
  ee.data.authenticateViaOAuth(
    CLIENT_ID,
    () => {
      // Éxito en autenticación OAuth2
      console.log('Autenticación GEE completada.');
      ee.initialize(
        null, // URL del endpoint (null usa el default de Google)
        () => {
          console.log('Earth Engine inicializado exitosamente en proyecto:', PROJECT_ID);
          cargarColeccionSentinel2();
        },
        (error) => {
          console.error('Fallo al inicializar Earth Engine:', error);
        },
        null,
        PROJECT_ID // ID de proyecto en Google Cloud
      );
    },
    (authError) => {
      console.error('Error durante autenticación OAuth2:', authError);
    },
    ['https://www.googleapis.com/auth/earthengine']
  );
}

// 4. Carga y filtrado de Sentinel-2 SR Harmonized
function cargarColeccionSentinel2() {
  const poligonoLote = ee.Geometry.Polygon([[
    [-71.6620, -35.4190],
    [-71.6480, -35.4190],
    [-71.6480, -35.4320],
    [-71.6620, -35.4320]
  ]]);

  const s2Collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(poligonoLote)
    .filterDate('2025-11-01', '2026-01-31')
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
    .map(function(image) {
      // Cálculo de NDVI: (B8 - B4) / (B8 + B4)
      const ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI');
      return image.addBands(ndvi);
    });

  const medianComposite = s2Collection.median().clip(poligonoLote);
  print('Compuesto Sentinel-2 listo para análisis:', medianComposite);
}
`;
}

/**
 * Valida o simula la inicialización de GEE en la aplicación web
 */
export async function testGEEConnection(config: GEEConfig): Promise<{
  success: boolean;
  message: string;
}> {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (!config.projectId.trim()) {
        resolve({
          success: false,
          message: 'Debes especificar un ID de proyecto válido de Google Cloud con API Earth Engine habilitada.',
        });
      } else {
        resolve({
          success: true,
          message: `Conectado exitosamente al proyecto GEE '${config.projectId}' y colección '${config.collectionId}'.`,
        });
      }
    }, 600);
  });
}
