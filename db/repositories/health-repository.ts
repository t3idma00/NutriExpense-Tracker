import { getDb } from "@/db/database";
import type { AlertSeverity, AlertType, HealthAlert } from "@/types";
import { createId } from "@/utils/id";

const severityRank: Record<AlertSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

function mapAlert(row: Record<string, unknown>): HealthAlert {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    alertType: String(row.alert_type) as AlertType,
    nutrientKey: row.nutrient_key ? String(row.nutrient_key) : undefined,
    currentValue: row.current_value ? Number(row.current_value) : undefined,
    targetValue: row.target_value ? Number(row.target_value) : undefined,
    severity: String(row.severity) as AlertSeverity,
    message: String(row.message),
    messageTranslated: row.message_translated
      ? String(row.message_translated)
      : undefined,
    isRead: Number(row.is_read ?? 0) === 1 ? 1 : 0,
    triggeredAt: Number(row.triggered_at),
  };
}

export class HealthRepository {
  async createAlert(
    alert: Omit<HealthAlert, "id" | "isRead" | "triggeredAt"> & {
      id?: string;
      isRead?: 0 | 1;
      triggeredAt?: number;
    },
  ): Promise<HealthAlert> {
    const db = await getDb();
    const built: HealthAlert = {
      ...alert,
      id: alert.id ?? createId(),
      isRead: alert.isRead ?? 0,
      triggeredAt: alert.triggeredAt ?? Date.now(),
    };

    await db.runAsync(
      `INSERT OR REPLACE INTO health_alerts (
        id, user_id, alert_type, nutrient_key, current_value, target_value,
        severity, message, message_translated, is_read, triggered_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        built.id,
        built.userId,
        built.alertType,
        built.nutrientKey ?? null,
        built.currentValue ?? null,
        built.targetValue ?? null,
        built.severity,
        built.message,
        built.messageTranslated ?? null,
        built.isRead,
        built.triggeredAt,
      ],
    );

    return built;
  }

  async getAlerts(userId: string, unreadOnly = false): Promise<HealthAlert[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT *
       FROM health_alerts
       WHERE user_id = ? ${unreadOnly ? "AND is_read = 0" : ""}
       ORDER BY triggered_at DESC`,
      [userId],
    );

    return rows
      .map(mapAlert)
      .sort((a, b) => severityRank[b.severity] - severityRank[a.severity]);
  }

  async markRead(alertId: string): Promise<void> {
    const db = await getDb();
    await db.runAsync("UPDATE health_alerts SET is_read = 1 WHERE id = ?", [
      alertId,
    ]);
  }

  async rollingAverage(
    userId: string,
    nutrientColumn:
      | "calories"
      | "protein_g"
      | "carbs_g"
      | "fat_g"
      | "fiber_g"
      | "sugar_g"
      | "sodium_mg",
    days = 7,
  ): Promise<number> {
    const db = await getDb();
    const end = Date.now();
    const start = end - days * 86_400_000;
    const row = await db.getFirstAsync<Record<string, unknown>>(
      `SELECT AVG(${nutrientColumn}) AS avg_value
       FROM daily_nutrition_logs
       WHERE user_id = ? AND log_date BETWEEN ? AND ?`,
      [userId, start, end],
    );
    return Number(row?.avg_value ?? 0);
  }
}
