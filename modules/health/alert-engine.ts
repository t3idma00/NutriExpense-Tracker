import * as Notifications from "expo-notifications";
import { repositories } from "@/db/repositories";
import type { DailyTargets } from "@/constants/rda-values";
import { daysFromNow } from "@/utils/date";

function deficiencySeverity(ratio: number) {
  if (ratio < 0.5) return "critical";
  if (ratio < 0.7) return "high";
  if (ratio < 0.8) return "medium";
  return "low";
}

async function notify(title: string, body: string) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: null,
  });
}

export async function runAlertEngine(
  userId: string,
  targets: DailyTargets,
): Promise<void> {
  const existingAlerts = await repositories.health.getAlerts(userId, true);
  const existingKeySet = new Set(
    existingAlerts.map((a) => `${a.alertType}:${a.nutrientKey ?? ""}:${a.severity}`),
  );

  const checks: Array<{
    key: "protein_g" | "fiber_g" | "calories" | "sugar_g" | "sodium_mg";
    target: number;
    type: "deficiency" | "excess";
  }> = [
    { key: "protein_g", target: targets.proteinG, type: "deficiency" },
    { key: "fiber_g", target: targets.fiberG, type: "deficiency" },
    { key: "calories", target: targets.calories, type: "deficiency" },
    { key: "sugar_g", target: targets.sugarG, type: "excess" },
    { key: "sodium_mg", target: targets.sodiumMg, type: "excess" },
  ];

  for (const check of checks) {
    const avg = await repositories.health.rollingAverage(userId, check.key, 7);
    if (!avg || !check.target) continue;

    if (check.type === "deficiency" && avg < check.target * 0.8) {
      const ratio = avg / check.target;
      const severity = deficiencySeverity(ratio);
      const key = `deficiency:${check.key}:${severity}`;
      if (existingKeySet.has(key)) continue;

      await repositories.health.createAlert({
        userId,
        alertType: "deficiency",
        nutrientKey: check.key,
        currentValue: Math.round(avg),
        targetValue: check.target,
        severity,
        message: `${check.key.replace("_", " ")} is low. 7-day avg ${Math.round(avg)} vs target ${check.target}.`,
      });
      await notify("Nutrition Deficiency Alert", `${check.key} is below your target.`);
    }

    if (check.type === "excess" && avg > check.target * 1.5) {
      const severity = avg > check.target * 2 ? "critical" : "high";
      const key = `excess:${check.key}:${severity}`;
      if (existingKeySet.has(key)) continue;

      await repositories.health.createAlert({
        userId,
        alertType: "excess",
        nutrientKey: check.key,
        currentValue: Math.round(avg),
        targetValue: check.target,
        severity,
        message: `${check.key.replace("_", " ")} is high. 7-day avg ${Math.round(avg)} vs target ${check.target}.`,
      });
      await notify("Nutrition Excess Alert", `${check.key} is above your recommended limit.`);
    }
  }

  const items = await repositories.expense.listItems({
    from: Date.now() - 7 * 86_400_000,
    to: Date.now() + 7 * 86_400_000,
    limit: 200,
  });
  for (const item of items) {
    if (!item.expiryDate) continue;
    const days = daysFromNow(item.expiryDate);
    if (days > 3) continue;
    const severity = days < 0 ? "high" : "medium";
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
  }
}
