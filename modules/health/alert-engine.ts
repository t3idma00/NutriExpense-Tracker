import * as Notifications from "expo-notifications";
import { repositories } from "@/db/repositories";
import type { DailyTargets } from "@/constants/rda-values";
import { daysFromNow } from "@/utils/date";
import { recomputeNutritionAnalytics } from "@/services/nutrition-analytics.service";
import type { NutritionAnalyticsSnapshot } from "@/types";

function severityFromSignal(input: {
  gapRatio: number;
  zScore: number;
  reliabilityScore: number;
  type: "deficiency" | "excess";
}): "low" | "medium" | "high" | "critical" | null {
  const magnitude = Math.abs(input.gapRatio) + Math.abs(input.zScore) * 0.16;

  if (input.reliabilityScore < 0.4 && magnitude < 0.9) {
    return null;
  }
  if (magnitude >= 1.1) return "critical";
  if (magnitude >= 0.8) return "high";
  if (magnitude >= 0.45) return "medium";
  if (magnitude >= 0.25) return "low";
  return null;
}

async function notify(title: string, body: string) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: null,
  });
}

function formatNutrientLabel(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .toLowerCase();
}

export async function runAlertEngine(
  userId: string,
  targets: DailyTargets,
  existingAnalytics?: NutritionAnalyticsSnapshot | null,
): Promise<void> {
  const existingAlerts = await repositories.health.getAlerts(userId, true);
  const existingKeySet = new Set(
    existingAlerts.map((a) => `${a.alertType}:${a.nutrientKey ?? ""}:${a.severity}`),
  );

  const analytics =
    existingAnalytics ??
    (await recomputeNutritionAnalytics({
      userId,
      targets,
      windowDays: 42,
    }));
  if (analytics && analytics.reliabilityScore >= 0.35) {
    for (const metric of analytics.metrics) {
      const deficiencyKeys = new Set(["proteinG", "fiberG", "calories"]);
      const excessKeys = new Set(["sugarG", "sodiumMg"]);

      const deficiencySignal =
        deficiencyKeys.has(metric.key) && metric.targetGapRatio < -0.2;
      const excessSignal = excessKeys.has(metric.key) && metric.targetGapRatio > 0.2;
      if (!deficiencySignal && !excessSignal) continue;

      const type: "deficiency" | "excess" = deficiencySignal
        ? "deficiency"
        : "excess";
      const severity = severityFromSignal({
        gapRatio: metric.targetGapRatio,
        zScore: metric.zScore,
        reliabilityScore: analytics.reliabilityScore,
        type,
      });
      if (!severity) continue;

      const key = `${type}:${metric.key}:${severity}`;
      if (existingKeySet.has(key)) continue;

      const current = Math.round(metric.recentAvg);
      const target = Math.round(
        (() => {
          if (metric.key === "proteinG") return targets.proteinG;
          if (metric.key === "fiberG") return targets.fiberG;
          if (metric.key === "calories") return targets.calories;
          if (metric.key === "sugarG") return targets.sugarG;
          if (metric.key === "sodiumMg") return targets.sodiumMg;
          if (metric.key === "carbsG") return targets.carbsG;
          return targets.fatG;
        })(),
      );

      await repositories.health.createAlert({
        userId,
        alertType: type,
        nutrientKey: metric.key,
        currentValue: current,
        targetValue: target,
        severity,
        message:
          `${formatNutrientLabel(metric.key)} ${type === "deficiency" ? "is below" : "is above"} target. ` +
          `Recent avg ${current} vs target ${target}. ` +
          `Data reliability ${Math.round(analytics.reliabilityScore * 100)}%.`,
      });

      if (severity === "critical" || severity === "high") {
        await notify(
          type === "deficiency"
            ? "Critical Nutrition Deficiency"
            : "Critical Nutrition Excess",
          `${formatNutrientLabel(metric.key)} needs attention.`,
        );
      }
    }
  }

  const items = await repositories.expense.listItems({
    from: Date.now() - 7 * 86_400_000,
    to: Date.now() + 7 * 86_400_000,
    limit: 300,
  });
  for (const item of items) {
    if (!item.expiryDate) continue;
    const days = daysFromNow(item.expiryDate);
    if (days > 3) continue;

    const severity = days < 0 ? "high" : days <= 1 ? "medium" : "low";
    const key = `expiry_warning:${item.id}:${severity}`;
    if (existingKeySet.has(key)) continue;

    await repositories.health.createAlert({
      userId,
      alertType: "expiry_warning",
      nutrientKey: item.id,
      currentValue: days,
      targetValue: 3,
      severity,
      message:
        days < 0
          ? `${item.name} is expired.`
          : `${item.name} expires in ${days} day${days === 1 ? "" : "s"}.`,
    });

    if (days <= 0) {
      await notify("Expiry Warning", `${item.name} requires immediate use/disposal.`);
    }
  }
}
