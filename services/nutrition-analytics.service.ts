import { repositories } from "@/db/repositories";
import type {
  ConsumptionModel,
  NutrientMetricKey,
  NutritionAnalyticsMetric,
  NutritionAnalyticsSnapshot,
} from "@/types";
import type { DailyTargets } from "@/constants/rda-values";
import {
  clamp,
  coefficientOfVariation,
  linearRegressionSlope,
  mean,
  median,
  percentile,
  robustZScore,
} from "@/modules/analytics/statistics";

const nutrientToTarget: Record<
  NutrientMetricKey,
  (targets: DailyTargets) => number
> = {
  calories: (targets) => targets.calories,
  proteinG: (targets) => targets.proteinG,
  carbsG: (targets) => targets.carbsG,
  fatG: (targets) => targets.fatG,
  fiberG: (targets) => targets.fiberG,
  sugarG: (targets) => targets.sugarG,
  sodiumMg: (targets) => targets.sodiumMg,
};

function valuesForKey(
  series: Array<{
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG: number;
    sugarG: number;
    sodiumMg: number;
  }>,
  key: NutrientMetricKey,
): number[] {
  return series.map((entry) => entry[key]);
}

function recentWindow(values: number[], size = 7): number[] {
  if (values.length <= size) return values;
  return values.slice(values.length - size);
}

export async function recomputeNutritionAnalytics(input: {
  userId: string;
  targets: DailyTargets;
  from?: number;
  to?: number;
  windowDays?: number;
}): Promise<NutritionAnalyticsSnapshot | null> {
  const to = input.to ?? Date.now();
  const windowDays = input.windowDays ?? 56;
  const from = input.from ?? to - windowDays * 86_400_000;

  const [series, logCoverage, profileCoverage] = await Promise.all([
    repositories.nutrition.dailySeries(input.userId, from, to),
    repositories.nutrition.logCoverage(input.userId, from, to),
    repositories.nutrition.profileCoverageForLoggedItems(input.userId, from, to),
  ]);

  if (!series.length && logCoverage.totalLogs === 0) {
    return null;
  }

  const metrics: NutritionAnalyticsMetric[] = [];
  let anomalyCount = 0;
  for (const key of Object.keys(nutrientToTarget) as NutrientMetricKey[]) {
    const values = valuesForKey(series, key);
    const recent = recentWindow(values, 7);
    const recentAvg = mean(recent);
    const med = median(values);
    const p90 = percentile(values, 0.9);
    const zScore = robustZScore(recentAvg, values);
    const trendSlope = linearRegressionSlope(values);
    const target = nutrientToTarget[key](input.targets);
    const targetGapRatio = target > 0 ? (recentAvg - target) / target : 0;

    if (values.length >= 7 && Math.abs(zScore) >= 2.2) {
      anomalyCount += 1;
    }

    metrics.push({
      key,
      recentAvg,
      median: med,
      p90,
      zScore,
      trendSlope,
      targetGapRatio,
    });
  }

  const periodDays = Math.max(1, Math.round((to - from) / 86_400_000));
  const dayCoverage = clamp(series.length / periodDays, 0, 1);
  const macroCoverage =
    logCoverage.totalLogs > 0
      ? clamp(logCoverage.logsWithMacros / logCoverage.totalLogs, 0, 1)
      : 0;
  const profileMatchCoverage =
    profileCoverage.distinctLoggedItems > 0
      ? clamp(
          profileCoverage.itemsWithProfile / profileCoverage.distinctLoggedItems,
          0,
          1,
        )
      : 0;
  const confidenceBlend = clamp(
    logCoverage.avgConfidence * 0.65 +
      profileCoverage.avgProfileConfidence * 0.35,
    0,
    1,
  );
  const reliabilityScore = clamp(
    dayCoverage * 0.35 +
      macroCoverage * 0.25 +
      profileMatchCoverage * 0.2 +
      confidenceBlend * 0.2,
    0,
    1,
  );

  return repositories.analytics.saveSnapshot({
    userId: input.userId,
    fromTs: from,
    toTs: to,
    reliabilityScore,
    coverageScore: dayCoverage,
    anomalyCount,
    metrics,
  });
}

function groupByItem<T extends { expenseItemId: string }>(
  rows: T[],
): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const list = grouped.get(row.expenseItemId) ?? [];
    list.push(row);
    grouped.set(row.expenseItemId, list);
  }
  return grouped;
}

export async function recomputeConsumptionModels(input: {
  userId: string;
  from?: number;
  to?: number;
  windowDays?: number;
}): Promise<ConsumptionModel[]> {
  const to = input.to ?? Date.now();
  const windowDays = input.windowDays ?? 42;
  const from = input.from ?? to - windowDays * 86_400_000;
  const series = await repositories.nutrition.servingSeriesByItem(
    input.userId,
    from,
    to,
  );
  if (!series.length) return [];

  const grouped = groupByItem(series);
  const output: ConsumptionModel[] = [];

  for (const [expenseItemId, rows] of grouped.entries()) {
    const servings = rows.map((row) => row.servings);
    const avg = mean(servings);
    const slope = linearRegressionSlope(servings);
    const variability = coefficientOfVariation(servings);
    const avgConfidence = mean(rows.map((row) => row.avgConfidence));
    const confidence = clamp(
      avgConfidence * 0.6 +
        clamp(rows.length / 14, 0, 1) * 0.25 +
        (1 - clamp(variability, 0, 1)) * 0.15,
      0,
      1,
    );

    const modeled = await repositories.analytics.upsertConsumptionModel({
      userId: input.userId,
      expenseItemId,
      avgDailyServings: avg,
      trendSlope: slope,
      variability,
      confidence,
      lastPredictedDepletion:
        avg > 0
          ? Date.now() + Math.round(Math.max(1, 1 / avg)) * 86_400_000
          : undefined,
    });
    output.push(modeled);
  }

  return output;
}
