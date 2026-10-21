import React, { useState } from 'react';
import { X, Check, Copy, Terminal, CheckCircle2, AlertCircle, RefreshCw, ExternalLink, Zap, ShieldCheck, Database, Cpu, DollarSign, Layers } from 'lucide-react';
import { GEEConfig, getGEEJavaScriptInitializationCode, testGEEConnection } from '../utils/geeApi';

interface GEEApiModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: GEEConfig;
  onUpdateConfig: (config: GEEConfig) => void;
  onOpenCanvasView: () => void;
}

export const GEEApiModal: React.FC<GEEApiModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  onOpenCanvasView,
}) => {
  const [projectId, setProjectId] = useState<string>(config.projectId);
  const [collectionId, setCollectionId] = useState<string>(config.collectionId);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'what_it_does' | 'eecu_info' | 'js_code' | 'config' | 'python_diff'>('eecu_info');

  if (!isOpen) return null;

  const jsCode = getGEEJavaScriptInitializationCode(projectId);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(jsCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    const res = await testGEEConnection({ ...config, projectId, collectionId });
    setIsTesting(false);
    setTestResult(res);
    if (res.success) {
      onUpdateConfig({
        ...config,
        projectId,
        collectionId,
        status: 'connected',
        lastPing: `Verificado con ${collectionId} en ${projectId}`,
      });
    } else {
      onUpdateConfig({
        ...config,
        projectId,
        collectionId,
        status: 'error',
        errorMessage: res.message,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>API de Google Earth Engine (GEE)</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-mono font-semibold">
                  JavaScript
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Traducción de inicialización Python (<code>ee.Authenticate()</code> / <code>ee.Initialize()</code>) a JavaScript
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-slate-50 dark:bg-slate-950 text-xs font-medium overflow-x-auto">
          <button
            onClick={() => setActiveTab('what_it_does')}
            className={`py-2.5 px-3 border-b-2 font-mono whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'what_it_does'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            ¿Para qué sirve GEE?
          </button>
          <button
            onClick={() => setActiveTab('eecu_info')}
            className={`py-2.5 px-3 border-b-2 font-mono whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'eecu_info'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <span>Gestión de EECU & Cuotas</span>
            <span className="text-[10px] px-1 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
              0.00 EECU
            </span>
          </button>
          <button
            onClick={() => setActiveTab('js_code')}
            className={`py-2.5 px-3 border-b-2 font-mono whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'js_code'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Código JavaScript (GEE API)
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`py-2.5 px-3 border-b-2 font-mono whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'config'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Configuración de Proyecto
          </button>
          <button
            onClick={() => setActiveTab('python_diff')}
            className={`py-2.5 px-3 border-b-2 font-mono whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'python_diff'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Equivalencias Python ⇄ JS
          </button>
        </div>

        {/* Tab 0: What GEE API does in AgroVision */}
        {activeTab === 'what_it_does' && (
          <div className="p-6 flex-1 overflow-y-auto space-y-4 text-xs">
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4 rounded-xl space-y-2">
              <h4 className="font-bold text-sm text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>¿Qué te permite hacer la API de GEE dentro de AgroVision?</span>
              </h4>
              <p className="text-emerald-800 dark:text-emerald-300 leading-relaxed">
                A diferencia de descargar archivos manuales pesados, la API de Google Earth Engine procesa en la nube de Google la constelación Sentinel-2 y te entrega el <strong>Lienzo Satelital en Vivo</strong>:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  1. Recorte y Eliminación de Nubes
                </span>
                <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                  Filtra pixeles nubosos y sombras automáticamente con <code>CLOUDY_PIXEL_PERCENTAGE</code> y recorta el raster al polígono exacto de 131 ha.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  2. Reducción Temporal y Mosaicos
                </span>
                <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                  Genera la imagen sintética libre de artefactos usando <code>ee.Reducer.median()</code> o <code>max()</code> sobre todas las pasadas del satélite del período.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  3. Inspector de Firma Espectral
                </span>
                <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                  Al hacer clic en cualquier punto del huerto, visualizas la curva completa de reflectancia foliar desde el Azul hasta el Infrarrojo de Onda Corta (SWIR).
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  4. Exportación GeoTIFF para QGIS
                </span>
                <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                  Guarda la capa directamente en formato GeoTIFF monocanal Float32 georreferenciado en WGS84 para llevarlo a QGIS o ArcGIS.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-center">
              <button
                onClick={() => {
                  onOpenCanvasView();
                  onClose();
                }}
                className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-md flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span>Abrir Lienzo Satelital GEE en Vivo</span>
                <span>&rarr;</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 1: EECU Explanation & Quota Management */}
        {activeTab === 'eecu_info' && (
          <div className="p-6 flex-1 overflow-y-auto space-y-4 text-xs">
            {/* Main callout */}
            <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>¿Cómo se manejan las EECU en AgroVision?</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-mono font-bold text-[11px]">
                  Costo Actual: 0.00 EECU ($0.00)
                </span>
              </div>
              <p className="text-emerald-800 dark:text-emerald-300 leading-relaxed">
                ¡Buena noticia! No necesitas registrar una tarjeta de crédito ni vincular un proyecto de Google Cloud para ver el <strong>Lienzo Satelital</strong> ni para calcular los <strong>17 índices</strong> sobre tus parcelas. AgroVision implementa una arquitectura híbrida:
              </p>
            </div>

            {/* Two modes comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="p-3.5 rounded-xl border-2 border-emerald-500/50 bg-emerald-50/20 dark:bg-slate-800/60 space-y-2 relative">
                <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded bg-emerald-600 text-white font-mono text-[10px] font-bold">
                  ACTIVO
                </div>
                <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold">
                  <Cpu className="w-4 h-4 text-emerald-600" />
                  <span>1. Motor de Cómputo Local (In-Memory)</span>
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                  <p>
                    • <strong>Consumo EECU:</strong> 0.00 EECUs (100% Gratis).
                  </p>
                  <p>
                    • <strong>Dónde corre:</strong> En la CPU/GPU de tu propio navegador mediante TypedArrays de JavaScript y shaders de WebGL.
                  </p>
                  <p>
                    • <strong>Privacidad:</strong> Tus datos satelitales y coordenadas del huerto no salen a servidores externos.
                  </p>
                  <p>
                    • <strong>Latencia:</strong> Instantánea (sin colas de procesamiento de Google).
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 space-y-2 opacity-90">
                <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold">
                  <Database className="w-4 h-4 text-blue-500" />
                  <span>2. Modo Nube GEE API (Con Proyecto)</span>
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                  <p>
                    • <strong>Consumo EECU:</strong> Se factura a tu proyecto Google Cloud (~$0.45 USD por EECU-hora en planes comerciales).
                  </p>
                  <p>
                    • <strong>Para qué sirve:</strong> Series multitemporales de 5+ años, consultas a escala de cuencas completas, o exportaciones batch a Google Drive.
                  </p>
                  <p>
                    • <strong>Cuentas Académicas:</strong> Google otorga cuotas mensuales de EECU gratuitas sin costo.
                  </p>
                </div>
              </div>
            </div>

            {/* What is an EECU */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 bg-slate-50 dark:bg-slate-950/40 space-y-2">
              <h5 className="font-bold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <span>¿Qué es exactamente una EECU? (Earth Engine Compute Unit)</span>
              </h5>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Una <strong>EECU</strong> es la unidad con la que Google mide el poder computacional distribuido en sus centros de datos para tareas de Earth Engine. Equivale aproximadamente a la capacidad de procesamiento de <strong>1 CPU vCore dedicado con memoria RAM asociada</strong> ejecutando algoritmos de MapReduce sobre mosaicos satelitales.
              </p>
              <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[10px]">
                <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                  <div className="text-slate-400">Huerto (131 ha)</div>
                  <div className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">~0.001 EECU-h</div>
                  <div className="text-[9px] text-slate-400">&lt; $0.001 USD</div>
                </div>
                <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                  <div className="text-slate-400">Región del Maule</div>
                  <div className="font-bold text-blue-600 dark:text-blue-400 text-xs">~0.05 EECU-h</div>
                  <div className="text-[9px] text-slate-400">~$0.02 USD</div>
                </div>
                <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                  <div className="text-slate-400">Chile Central (5 años)</div>
                  <div className="font-bold text-amber-600 dark:text-amber-400 text-xs">~2.4 EECU-h</div>
                  <div className="text-[9px] text-slate-400">~$1.08 USD</div>
                </div>
              </div>
            </div>

            {/* Quick status bar */}
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Protección de Cuotas: <strong>Activa</strong> (Cómputo local garantizado 0.00 EECU)
                </span>
              </div>
              <button
                onClick={() => {
                  onOpenCanvasView();
                  onClose();
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Ir al Lienzo Satelital
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: JavaScript Code */}
        {activeTab === 'js_code' && (
          <div className="p-6 flex-1 overflow-y-auto space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                Código para ejecución en el navegador, Node.js o Google Earth Engine Code Editor:
              </span>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded text-xs font-mono transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '¡Copiado!' : 'Copiar Código'}</span>
              </button>
            </div>

            <pre className="p-4 bg-slate-950 text-emerald-400 rounded-lg text-xs font-mono overflow-x-auto leading-relaxed border border-slate-800 max-h-[46vh]">
              <code>{jsCode}</code>
            </pre>
          </div>
        )}

        {/* Tab 2: Project Settings & Test */}
        {activeTab === 'config' && (
          <div className="p-6 flex-1 overflow-y-auto space-y-4">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Google Cloud Project ID:
                </label>
                <input
                  type="text"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  placeholder="ej. ee-mi-empresa-agro"
                  className="w-full text-xs font-mono p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Colección Satelital Predeterminada:
                </label>
                <input
                  type="text"
                  value={collectionId}
                  onChange={(e) => setCollectionId(e.target.value)}
                  className="w-full text-xs font-mono p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2">
                <button
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                  <span>{isTesting ? 'Validando conexión...' : 'Probar Conexión con GEE'}</span>
                </button>
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                    testResult.success
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Comparison Python vs JS */}
        {activeTab === 'python_diff' && (
          <div className="p-6 flex-1 overflow-y-auto space-y-4 text-xs">
            <p className="text-slate-600 dark:text-slate-300">
              Comparativa directa entre el código original en Python y su traslación funcional a JavaScript:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-slate-50 dark:bg-slate-950/50">
                <div className="font-bold text-slate-700 dark:text-slate-300 mb-2 font-mono flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span>Python (Original)</span>
                </div>
                <pre className="font-mono text-[11px] text-slate-800 dark:text-slate-300 leading-relaxed overflow-x-auto">
{`import ee

# 1. Autenticación interactiva
ee.Authenticate()

# 2. Inicialización con proyecto
ee.Initialize(project='${projectId}')

# 3. Filtrado de colección
s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED') \\
  .filterBounds(lote) \\
  .filterDate('2025-11-01', '2026-01-31')`}
                </pre>
              </div>

              <div className="border border-emerald-200 dark:border-emerald-800/80 rounded-lg p-3 bg-emerald-50/30 dark:bg-slate-950/80">
                <div className="font-bold text-emerald-700 dark:text-emerald-400 mb-2 font-mono flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>JavaScript (Traducido)</span>
                </div>
                <pre className="font-mono text-[11px] text-slate-800 dark:text-slate-300 leading-relaxed overflow-x-auto">
{`// 1. Autenticación OAuth2 cliente
ee.data.authenticateViaOAuth(CLIENT_ID, () => {
  // 2. Inicialización con proyecto
  ee.initialize(null, () => {
    // 3. Filtrado de colección
    const s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
      .filterBounds(poligonoLote)
      .filterDate('2025-11-01', '2026-01-31');
  }, null, null, '${projectId}');
});`}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            Estado: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{config.status === 'connected' ? '● Conectado a GEE' : 'Desconectado'}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
