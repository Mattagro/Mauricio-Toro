import {
  ChangeClassification,
  ComparativeAnalysisResult,
  TemporalDataPoint,
  GeoRasterData,
} from '../types/geotiff';
import { computeLayerStatistics } from './statistics';
import { COMPARATIVE_SEASONS_INFO, createDatasetForSeason } from './defaultDataset';

/**
 * Computes pixel-by-pixel differential change between two seasons/images:
 * Delta = Season B - Season A
 */
export function computeComparativeAnalysis(
  dataA: Float32Array,
  dataB: Float32Array,
  seasonAName: string,
  seasonBName: string,
  indexId: string,
  pixelWidthMeters: number = 8.1,
  pixelHeightMeters: number = 9.9
): ComparativeAnalysisResult {
  const length = Math.min(dataA.length, dataB.length);
  const deltaData = new Float32Array(length);

  let strongGainCount = 0;
  let slightGainCount = 0;
  let stableCount = 0;
  let slightLossCount = 0;
  let strongLossCount = 0;
  let validDiffCount = 0;

  for (let i = 0; i < length; i++) {
    const valA = dataA[i];
    const valB = dataB[i];

    if (isNaN(valA) || isNaN(valB) || !Number.isFinite(valA) || !Number.isFinite(valB)) {
      deltaData[i] = NaN;
      continue;
    }

    const diff = valB - valA;
    deltaData[i] = parseFloat(diff.toFixed(4));
    validDiffCount++;

    // Classify
    if (diff > 0.10) {
      strongGainCount++;
    } else if (diff >= 0.03) {
      slightGainCount++;
    } else if (diff > -0.03) {
      stableCount++;
    } else if (diff >= -0.10) {
      slightLossCount++;
    } else {
      strongLossCount++;
    }
  }

  const deltaStats = computeLayerStatistics(deltaData, pixelWidthMeters, pixelHeightMeters);

  const totalValid = validDiffCount || 1;
  const pixelAreaHa = (pixelWidthMeters * pixelHeightMeters) / 10000;

  const classifications: ChangeClassification[] = [
    {
      category: 'strong_gain',
      label: 'Ganancia Alta (> +0.10)',
      description: 'Crecimiento foliar vigoroso y expansión de copa',
      color: '#006d2c',
      pixelCount: strongGainCount,
      hectares: parseFloat((strongGainCount * pixelAreaHa).toFixed(1)),
      percentage: parseFloat(((strongGainCount / totalValid) * 100).toFixed(1)),
    },
    {
      category: 'slight_gain',
      label: 'Ganancia Moderada (+0.03 a +0.10)',
      description: 'Mejora sostenida en biomasa y verdor',
      color: '#41ab5d',
      pixelCount: slightGainCount,
      hectares: parseFloat((slightGainCount * pixelAreaHa).toFixed(1)),
      percentage: parseFloat(((slightGainCount / totalValid) * 100).toFixed(1)),
    },
    {
      category: 'stable',
      label: 'Estable (-0.03 a +0.03)',
      description: 'Mantenimiento del equilibrio vegetativo',
      color: '#cbd5e1',
      pixelCount: stableCount,
      hectares: parseFloat((stableCount * pixelAreaHa).toFixed(1)),
      percentage: parseFloat(((stableCount / totalValid) * 100).toFixed(1)),
    },
    {
      category: 'slight_loss',
      label: 'Declive Leve (-0.10 a -0.03)',
      description: 'Alerta temprana: menor vigor relativo o estrés hídrico incipiente',
      color: '#ef6c37',
      pixelCount: slightLossCount,
      hectares: parseFloat((slightLossCount * pixelAreaHa).toFixed(1)),
      percentage: parseFloat(((slightLossCount / totalValid) * 100).toFixed(1)),
    },
    {
      category: 'strong_loss',
      label: 'Declive Severo (< -0.10)',
      description: 'Pérdida crítica de cobertura, daño sanitario o déficit de riego',
      color: '#b41820',
      pixelCount: strongLossCount,
      hectares: parseFloat((strongLossCount * pixelAreaHa).toFixed(1)),
      percentage: parseFloat(((strongLossCount / totalValid) * 100).toFixed(1)),
    },
  ];

  const improvedHa = classifications[0].hectares + classifications[1].hectares;
  const improvedPercent = classifications[0].percentage + classifications[1].percentage;

  const declinedHa = classifications[3].hectares + classifications[4].hectares;
  const declinedPercent = classifications[3].percentage + classifications[4].percentage;

  const stableHa = classifications[2].hectares;
  const stablePercent = classifications[2].percentage;

  // Pattern detection heuristics
  const detectedPatterns: string[] = [];

  if (deltaStats.mean > 0.04) {
    detectedPatterns.push(
      `Tendencia de desarrollo netamente ascendente (+${(deltaStats.mean * 100).toFixed(1)}% en ${indexId}). El huerto manifiesta una marcada expansión de copa y acumulación de biomasa.`
    );
  } else if (deltaStats.mean < -0.04) {
    detectedPatterns.push(
      `Tendencia general de declive (-${Math.abs(deltaStats.mean * 100).toFixed(1)}% en ${indexId}). Requiere revisión de programas de riego o nutrición en sectores deprimidos.`
    );
  } else {
    detectedPatterns.push(
      `Comportamiento general estable (Delta medio de ${deltaStats.mean >= 0 ? '+' : ''}${deltaStats.mean.toFixed(3)}). Alta consistencia fenológica entre ambas fechas.`
    );
  }

  if (improvedPercent > 55) {
    detectedPatterns.push(
      `El ${improvedPercent.toFixed(1)}% del huerto (${improvedHa.toFixed(1)} ha) experimentó ganancia positiva de vigor en la temporada.`
    );
  }

  if (declinedPercent > 12) {
    detectedPatterns.push(
      `Se identificaron ${declinedHa.toFixed(1)} ha (${declinedPercent.toFixed(1)}%) en zona de declive que requieren inspección prioritaria en terreno.`
    );
  } else {
    detectedPatterns.push(
      `Baja incidencia de focos de estrés crítico: menos del 5% del predio presenta declive severo.`
    );
  }

  return {
    deltaData,
    deltaStats,
    seasonAName,
    seasonBName,
    indexId,
    meanDelta: deltaStats.mean,
    medianDelta: deltaStats.median,
    improvedHa: parseFloat(improvedHa.toFixed(1)),
    improvedPercent: parseFloat(improvedPercent.toFixed(1)),
    declinedHa: parseFloat(declinedHa.toFixed(1)),
    declinedPercent: parseFloat(declinedPercent.toFixed(1)),
    stableHa: parseFloat(stableHa.toFixed(1)),
    stablePercent: parseFloat(stablePercent.toFixed(1)),
    classifications,
    detectedPatterns,
  };
}

/**
 * Builds chronological time series data points across all comparative seasons for an index.
 */
export function buildTemporalTimeSeries(
  indexId: string,
  preloadedDatasets?: Map<string, GeoRasterData>
): TemporalDataPoint[] {
  const results: TemporalDataPoint[] = [];

  for (const sInfo of COMPARATIVE_SEASONS_INFO) {
    let dataset = preloadedDatasets?.get(sInfo.key);
    if (!dataset) {
      dataset = createDatasetForSeason(sInfo.key);
    }

    const bandData = dataset.bands.get(indexId);
    if (bandData) {
      const stats = computeLayerStatistics(
        bandData,
        dataset.transform.pixelWidthMeters,
        dataset.transform.pixelHeightMeters
      );

      results.push({
        seasonKey: sInfo.key,
        seasonLabel: sInfo.name,
        dateRange: sInfo.period,
        phenologyStage: sInfo.stage,
        mean: stats.mean,
        median: stats.median,
        p5: stats.p5,
        p95: stats.p95,
        stdDev: stats.stdDev,
        fileName: sInfo.fileName,
        areaHa: stats.areaHa,
      });
    }
  }

  return results;
}
