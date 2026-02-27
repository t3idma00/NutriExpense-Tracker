import { getDb } from "@/db/database";
import type {
  DailyNutritionLog,
  NutritionAggregate,
  NutritionProfile,
} from "@/types";
import { createId } from "@/utils/id";

function numberOrUndefined(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function clampOptional(value: number | undefined, min: number, max: number): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.min(max, Math.max(min, value));
}

function sanitizeProfileInput(
  profile: Omit<NutritionProfile, "id" | "createdAt"> & { id?: string },
): Omit<NutritionProfile, "id" | "createdAt"> & { id?: string } {
  return {
    ...profile,
    servingSizeG: clampOptional(profile.servingSizeG, 1, 2000),
    servingsPerContainer: clampOptional(profile.servingsPerContainer, 0.1, 100),
    calories: clampOptional(profile.calories, 0, 2500),
    proteinG: clampOptional(profile.proteinG, 0, 300),
    carbsG: clampOptional(profile.carbsG, 0, 400),
    fatG: clampOptional(profile.fatG, 0, 250),
    fiberG: clampOptional(profile.fiberG, 0, 120),
    sugarG: clampOptional(profile.sugarG, 0, 250),
    sodiumMg: clampOptional(profile.sodiumMg, 0, 12000),
    aiConfidenceScore: clampOptional(profile.aiConfidenceScore, 0, 1),
  };
}

function mapNutritionProfile(row: Record<string, unknown>): NutritionProfile {
  return {
    id: String(row.id),
    expenseItemId: String(row.expense_item_id),
    source: String(row.source) as NutritionProfile["source"],
    servingSizeG: numberOrUndefined(row.serving_size_g),
    servingsPerContainer: numberOrUndefined(row.servings_per_container),
    calories: numberOrUndefined(row.calories),
    proteinG: numberOrUndefined(row.protein_g),
    carbsG: numberOrUndefined(row.carbs_g),
    fatG: numberOrUndefined(row.fat_g),
    fiberG: numberOrUndefined(row.fiber_g),
    sugarG: numberOrUndefined(row.sugar_g),
    saturatedFatG: numberOrUndefined(row.saturated_fat_g),
    transFatG: numberOrUndefined(row.trans_fat_g),
    unsaturatedFatG: numberOrUndefined(row.unsaturated_fat_g),
    sodiumMg: numberOrUndefined(row.sodium_mg),
    potassiumMg: numberOrUndefined(row.potassium_mg),
    calciumMg: numberOrUndefined(row.calcium_mg),
    ironMg: numberOrUndefined(row.iron_mg),
    magnesiumMg: numberOrUndefined(row.magnesium_mg),
    vitaminAMcg: numberOrUndefined(row.vitamin_a_mcg),
    vitaminCMg: numberOrUndefined(row.vitamin_c_mg),
    vitaminDMcg: numberOrUndefined(row.vitamin_d_mcg),
    vitaminEMg: numberOrUndefined(row.vitamin_e_mg),
    vitaminKMcg: numberOrUndefined(row.vitamin_k_mcg),
    vitaminB1Mg: numberOrUndefined(row.vitamin_b1_mg),
    vitaminB2Mg: numberOrUndefined(row.vitamin_b2_mg),
    vitaminB3Mg: numberOrUndefined(row.vitamin_b3_mg),
    vitaminB6Mg: numberOrUndefined(row.vitamin_b6_mg),
    vitaminB12Mcg: numberOrUndefined(row.vitamin_b12_mcg),
    folateMcg: numberOrUndefined(row.folate_mcg),
    zincMg: numberOrUndefined(row.zinc_mg),
    seleniumMcg: numberOrUndefined(row.selenium_mcg),
    cholesterolMg: numberOrUndefined(row.cholesterol_mg),
    aiConfidenceScore: numberOrUndefined(row.ai_confidence_score),
    rawLabelText: row.raw_label_text ? String(row.raw_label_text) : undefined,
    createdAt: Number(row.created_at),
  };
}

export class NutritionRepository {
  async upsertNutritionProfile(
    profile: Omit<NutritionProfile, "id" | "createdAt"> & { id?: string },
  ): Promise<NutritionProfile> {
    const db = await getDb();
    const now = Date.now();
    const sanitized = sanitizeProfileInput(profile);
    const id = sanitized.id ?? createId();

    await db.runAsync(
      `INSERT OR REPLACE INTO nutrition_profiles (
        id, expense_item_id, source, serving_size_g, servings_per_container, calories,
        protein_g, carbs_g, fat_g, fiber_g, sugar_g, saturated_fat_g, trans_fat_g,
        unsaturated_fat_g, sodium_mg, potassium_mg, calcium_mg, iron_mg, magnesium_mg,
        vitamin_a_mcg, vitamin_c_mg, vitamin_d_mcg, vitamin_e_mg, vitamin_k_mcg,
        vitamin_b1_mg, vitamin_b2_mg, vitamin_b3_mg, vitamin_b6_mg, vitamin_b12_mcg,
        folate_mcg, zinc_mg, selenium_mcg, cholesterol_mg, ai_confidence_score, raw_label_text, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        sanitized.expenseItemId,
        sanitized.source,
        sanitized.servingSizeG ?? null,
        sanitized.servingsPerContainer ?? null,
        sanitized.calories ?? null,
        sanitized.proteinG ?? null,
        sanitized.carbsG ?? null,
        sanitized.fatG ?? null,
        sanitized.fiberG ?? null,
        sanitized.sugarG ?? null,
        sanitized.saturatedFatG ?? null,
        sanitized.transFatG ?? null,
        sanitized.unsaturatedFatG ?? null,
        sanitized.sodiumMg ?? null,
        sanitized.potassiumMg ?? null,
        sanitized.calciumMg ?? null,
        sanitized.ironMg ?? null,
        sanitized.magnesiumMg ?? null,
        sanitized.vitaminAMcg ?? null,
        sanitized.vitaminCMg ?? null,
        sanitized.vitaminDMcg ?? null,
        sanitized.vitaminEMg ?? null,
        sanitized.vitaminKMcg ?? null,
        sanitized.vitaminB1Mg ?? null,
        sanitized.vitaminB2Mg ?? null,
        sanitized.vitaminB3Mg ?? null,
        sanitized.vitaminB6Mg ?? null,
        sanitized.vitaminB12Mcg ?? null,
        sanitized.folateMcg ?? null,
        sanitized.zincMg ?? null,
        sanitized.seleniumMcg ?? null,
        sanitized.cholesterolMg ?? null,
        sanitized.aiConfidenceScore ?? null,
        sanitized.rawLabelText ?? null,
        now,
      ],
    );

    return {
      ...sanitized,
      id,
      createdAt: now,
    };
  }

  async getNutritionByItemId(itemId: string): Promise<NutritionProfile | null> {
    const db = await getDb();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      "SELECT * FROM nutrition_profiles WHERE expense_item_id = ? ORDER BY created_at DESC LIMIT 1",
      [itemId],
    );
    return row ? mapNutritionProfile(row) : null;
  }

  async logConsumption(
    log: Omit<DailyNutritionLog, "id" | "createdAt"> & { id?: string },
  ): Promise<DailyNutritionLog> {
    const db = await getDb();
    const now = Date.now();
    const id = log.id ?? createId();
    await db.runAsync(
      `INSERT INTO daily_nutrition_logs (
        id, user_id, log_date, expense_item_id, consumed_servings, calories,
        protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, confidence_score, source, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        log.userId,
        log.logDate,
        log.expenseItemId,
        log.consumedServings,
        log.calories ?? null,
        log.proteinG ?? null,
        log.carbsG ?? null,
        log.fatG ?? null,
        log.fiberG ?? null,
        log.sugarG ?? null,
        log.sodiumMg ?? null,
        log.confidenceScore ?? null,
        log.source ?? null,
        now,
      ],
    );

    return { ...log, id, createdAt: now };
  }

  async aggregateByRange(
    userId: string,
    from: number,
    to: number,
  ): Promise<NutritionAggregate> {
    const db = await getDb();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      `SELECT
        COALESCE(SUM(calories), 0) AS calories,
        COALESCE(SUM(protein_g), 0) AS protein_g,
        COALESCE(SUM(carbs_g), 0) AS carbs_g,
        COALESCE(SUM(fat_g), 0) AS fat_g,
        COALESCE(SUM(fiber_g), 0) AS fiber_g,
        COALESCE(SUM(sugar_g), 0) AS sugar_g,
        COALESCE(SUM(sodium_mg), 0) AS sodium_mg
      FROM daily_nutrition_logs
      WHERE user_id = ? AND log_date BETWEEN ? AND ?`,
      [userId, from, to],
    );

    return {
      calories: Number(row?.calories ?? 0),
      proteinG: Number(row?.protein_g ?? 0),
      carbsG: Number(row?.carbs_g ?? 0),
      fatG: Number(row?.fat_g ?? 0),
      fiberG: Number(row?.fiber_g ?? 0),
      sugarG: Number(row?.sugar_g ?? 0),
      sodiumMg: Number(row?.sodium_mg ?? 0),
    };
  }

  async recentLogs(
    userId: string,
    from: number,
    to: number,
  ): Promise<DailyNutritionLog[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM daily_nutrition_logs
       WHERE user_id = ? AND log_date BETWEEN ? AND ?
       ORDER BY log_date DESC, created_at DESC`,
      [userId, from, to],
    );

    return rows.map((row) => ({
      id: String(row.id),
      userId: String(row.user_id),
      logDate: Number(row.log_date),
      expenseItemId: String(row.expense_item_id),
      consumedServings: Number(row.consumed_servings ?? 1),
      calories: numberOrUndefined(row.calories),
      proteinG: numberOrUndefined(row.protein_g),
      carbsG: numberOrUndefined(row.carbs_g),
      fatG: numberOrUndefined(row.fat_g),
      fiberG: numberOrUndefined(row.fiber_g),
      sugarG: numberOrUndefined(row.sugar_g),
      sodiumMg: numberOrUndefined(row.sodium_mg),
      confidenceScore: numberOrUndefined(row.confidence_score),
      source: row.source ? String(row.source) as DailyNutritionLog["source"] : undefined,
      createdAt: Number(row.created_at),
    }));
  }

  async dailySeries(
    userId: string,
    from: number,
    to: number,
  ): Promise<
    Array<{
      day: number;
      calories: number;
      proteinG: number;
      carbsG: number;
      fatG: number;
      fiberG: number;
      sugarG: number;
      sodiumMg: number;
      avgConfidence: number;
      logCount: number;
    }>
  > {
    const db = await getDb();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT
        CAST((log_date / 86400000) AS INTEGER) * 86400000 AS day_start,
        COALESCE(SUM(calories), 0) AS calories,
        COALESCE(SUM(protein_g), 0) AS protein_g,
        COALESCE(SUM(carbs_g), 0) AS carbs_g,
        COALESCE(SUM(fat_g), 0) AS fat_g,
        COALESCE(SUM(fiber_g), 0) AS fiber_g,
        COALESCE(SUM(sugar_g), 0) AS sugar_g,
        COALESCE(SUM(sodium_mg), 0) AS sodium_mg,
        COALESCE(AVG(confidence_score), 0) AS avg_confidence,
        COUNT(*) AS log_count
      FROM daily_nutrition_logs
      WHERE user_id = ? AND log_date BETWEEN ? AND ?
      GROUP BY day_start
      ORDER BY day_start ASC`,
      [userId, from, to],
    );

    return rows.map((row) => ({
      day: Number(row.day_start),
      calories: Number(row.calories ?? 0),
      proteinG: Number(row.protein_g ?? 0),
      carbsG: Number(row.carbs_g ?? 0),
      fatG: Number(row.fat_g ?? 0),
      fiberG: Number(row.fiber_g ?? 0),
      sugarG: Number(row.sugar_g ?? 0),
      sodiumMg: Number(row.sodium_mg ?? 0),
      avgConfidence: Number(row.avg_confidence ?? 0),
      logCount: Number(row.log_count ?? 0),
    }));
  }

  async logCoverage(
    userId: string,
    from: number,
    to: number,
  ): Promise<{
    totalLogs: number;
    logsWithMacros: number;
    avgConfidence: number;
  }> {
    const db = await getDb();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      `SELECT
        COUNT(*) AS total_logs,
        SUM(
          CASE WHEN calories IS NOT NULL OR protein_g IS NOT NULL OR carbs_g IS NOT NULL
            OR fat_g IS NOT NULL OR fiber_g IS NOT NULL OR sugar_g IS NOT NULL OR sodium_mg IS NOT NULL
          THEN 1 ELSE 0 END
        ) AS logs_with_macros,
        COALESCE(AVG(confidence_score), 0) AS avg_confidence
      FROM daily_nutrition_logs
      WHERE user_id = ? AND log_date BETWEEN ? AND ?`,
      [userId, from, to],
    );

    return {
      totalLogs: Number(row?.total_logs ?? 0),
      logsWithMacros: Number(row?.logs_with_macros ?? 0),
      avgConfidence: Number(row?.avg_confidence ?? 0),
    };
  }

  async profileCoverageForLoggedItems(
    userId: string,
    from: number,
    to: number,
  ): Promise<{
    distinctLoggedItems: number;
    itemsWithProfile: number;
    avgProfileConfidence: number;
  }> {
    const db = await getDb();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      `SELECT
        COUNT(DISTINCT d.expense_item_id) AS distinct_items,
        COUNT(DISTINCT CASE WHEN n.id IS NOT NULL THEN d.expense_item_id END) AS items_with_profile,
        COALESCE(AVG(n.ai_confidence_score), 0) AS avg_profile_confidence
      FROM daily_nutrition_logs d
      LEFT JOIN (
        SELECT t1.*
        FROM nutrition_profiles t1
        JOIN (
          SELECT expense_item_id, MAX(created_at) AS latest_created_at
          FROM nutrition_profiles
          GROUP BY expense_item_id
        ) latest
        ON latest.expense_item_id = t1.expense_item_id
        AND latest.latest_created_at = t1.created_at
      ) n
      ON n.expense_item_id = d.expense_item_id
      WHERE d.user_id = ? AND d.log_date BETWEEN ? AND ?`,
      [userId, from, to],
    );

    return {
      distinctLoggedItems: Number(row?.distinct_items ?? 0),
      itemsWithProfile: Number(row?.items_with_profile ?? 0),
      avgProfileConfidence: Number(row?.avg_profile_confidence ?? 0),
    };
  }

  async servingSeriesByItem(
    userId: string,
    from: number,
    to: number,
  ): Promise<
    Array<{
      expenseItemId: string;
      day: number;
      servings: number;
      avgConfidence: number;
    }>
  > {
    const db = await getDb();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT
        expense_item_id,
        CAST((log_date / 86400000) AS INTEGER) * 86400000 AS day_start,
        COALESCE(SUM(consumed_servings), 0) AS servings,
        COALESCE(AVG(confidence_score), 0) AS avg_confidence
      FROM daily_nutrition_logs
      WHERE user_id = ? AND log_date BETWEEN ? AND ?
      GROUP BY expense_item_id, day_start
      ORDER BY expense_item_id ASC, day_start ASC`,
      [userId, from, to],
    );

    return rows.map((row) => ({
      expenseItemId: String(row.expense_item_id),
      day: Number(row.day_start),
      servings: Number(row.servings ?? 0),
      avgConfidence: Number(row.avg_confidence ?? 0),
    }));
  }
}
