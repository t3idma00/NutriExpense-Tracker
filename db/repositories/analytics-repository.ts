import { getDb } from "@/db/database";
import type {
  ConsumptionModel,
  NutritionAnalyticsMetric,
  NutritionAnalyticsSnapshot,
} from "@/types";
import { createId } from "@/utils/id";

function mapSnapshot(row: Record<string, unknown>): NutritionAnalyticsSnapshot {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    fromTs: Number(row.from_ts),
    toTs: Number(row.to_ts),
    reliabilityScore: Number(row.reliability_score ?? 0),
    coverageScore: Number(row.coverage_score ?? 0),
    anomalyCount: Number(row.anomaly_count ?? 0),
    metrics: JSON.parse(String(row.metrics_json ?? "[]")) as NutritionAnalyticsMetric[],
    createdAt: Number(row.created_at),
  };
}

function mapModel(row: Record<string, unknown>): ConsumptionModel {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    expenseItemId: String(row.expense_item_id),
    avgDailyServings: Number(row.avg_daily_servings ?? 0),
    trendSlope: Number(row.trend_slope ?? 0),
    variability: Number(row.variability ?? 0),
    confidence: Number(row.confidence ?? 0),
    lastPredictedDepletion:
      row.last_predicted_depletion === null || row.last_predicted_depletion === undefined
        ? undefined
        : Number(row.last_predicted_depletion),
    updatedAt: Number(row.updated_at),
  };
}

export class AnalyticsRepository {
  async saveSnapshot(input: {
    userId: string;
    fromTs: number;
    toTs: number;
    reliabilityScore: number;
    coverageScore: number;
    anomalyCount: number;
    metrics: NutritionAnalyticsMetric[];
  }): Promise<NutritionAnalyticsSnapshot> {
    const db = await getDb();
    const now = Date.now();
    const snapshot: NutritionAnalyticsSnapshot = {
      id: createId(),
      userId: input.userId,
      fromTs: input.fromTs,
      toTs: input.toTs,
      reliabilityScore: input.reliabilityScore,
      coverageScore: input.coverageScore,
      anomalyCount: input.anomalyCount,
      metrics: input.metrics,
      createdAt: now,
    };

    await db.runAsync(
      `INSERT INTO nutrition_analytics_snapshots (
        id, user_id, from_ts, to_ts, reliability_score, coverage_score, anomaly_count, metrics_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        snapshot.id,
        snapshot.userId,
        snapshot.fromTs,
        snapshot.toTs,
        snapshot.reliabilityScore,
        snapshot.coverageScore,
        snapshot.anomalyCount,
        JSON.stringify(snapshot.metrics),
        snapshot.createdAt,
      ],
    );

    return snapshot;
  }

  async getLatestSnapshot(userId: string): Promise<NutritionAnalyticsSnapshot | null> {
    const db = await getDb();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      `SELECT *
       FROM nutrition_analytics_snapshots
       WHERE user_id = ?
       ORDER BY to_ts DESC, created_at DESC
       LIMIT 1`,
      [userId],
    );
    return row ? mapSnapshot(row) : null;
  }

  async listSnapshots(userId: string, limit = 30): Promise<NutritionAnalyticsSnapshot[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT *
       FROM nutrition_analytics_snapshots
       WHERE user_id = ?
       ORDER BY to_ts DESC, created_at DESC
       LIMIT ?`,
      [userId, limit],
    );
    return rows.map(mapSnapshot);
  }

  async upsertConsumptionModel(
    model: Omit<ConsumptionModel, "id" | "updatedAt"> & { id?: string; updatedAt?: number },
  ): Promise<ConsumptionModel> {
    const db = await getDb();
    const built: ConsumptionModel = {
      ...model,
      id: model.id ?? createId(),
      updatedAt: model.updatedAt ?? Date.now(),
    };

    await db.runAsync(
      `INSERT INTO consumption_models (
        id, user_id, expense_item_id, avg_daily_servings, trend_slope, variability, confidence,
        last_predicted_depletion, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, expense_item_id)
      DO UPDATE SET
        avg_daily_servings = excluded.avg_daily_servings,
        trend_slope = excluded.trend_slope,
        variability = excluded.variability,
        confidence = excluded.confidence,
        last_predicted_depletion = excluded.last_predicted_depletion,
        updated_at = excluded.updated_at`,
      [
        built.id,
        built.userId,
        built.expenseItemId,
        built.avgDailyServings,
        built.trendSlope,
        built.variability,
        built.confidence,
        built.lastPredictedDepletion ?? null,
        built.updatedAt,
      ],
    );

    const latest = await this.getConsumptionModelForItem(built.userId, built.expenseItemId);
    return latest ?? built;
  }

  async getConsumptionModelForItem(
    userId: string,
    expenseItemId: string,
  ): Promise<ConsumptionModel | null> {
    const db = await getDb();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      `SELECT * FROM consumption_models
       WHERE user_id = ? AND expense_item_id = ?
       LIMIT 1`,
      [userId, expenseItemId],
    );
    return row ? mapModel(row) : null;
  }

  async listTopConsumptionModels(userId: string, limit = 50): Promise<ConsumptionModel[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM consumption_models
       WHERE user_id = ?
       ORDER BY confidence DESC, updated_at DESC
       LIMIT ?`,
      [userId, limit],
    );
    return rows.map(mapModel);
  }
}
