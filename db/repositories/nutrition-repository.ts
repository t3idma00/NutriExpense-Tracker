import { getDb } from "@/db/database";
import type {
  DailyNutritionLog,
  NutritionAggregate,
  NutritionProfile,
} from "@/types";
import { createId } from "@/utils/id";

function mapNutritionProfile(row: Record<string, unknown>): NutritionProfile {
  return {
    id: String(row.id),
    expenseItemId: String(row.expense_item_id),
    source: String(row.source) as NutritionProfile["source"],
    servingSizeG: row.serving_size_g ? Number(row.serving_size_g) : undefined,
    servingsPerContainer: row.servings_per_container
      ? Number(row.servings_per_container)
      : undefined,
    calories: row.calories ? Number(row.calories) : undefined,
    proteinG: row.protein_g ? Number(row.protein_g) : undefined,
    carbsG: row.carbs_g ? Number(row.carbs_g) : undefined,
    fatG: row.fat_g ? Number(row.fat_g) : undefined,
    fiberG: row.fiber_g ? Number(row.fiber_g) : undefined,
    sugarG: row.sugar_g ? Number(row.sugar_g) : undefined,
    saturatedFatG: row.saturated_fat_g ? Number(row.saturated_fat_g) : undefined,
    transFatG: row.trans_fat_g ? Number(row.trans_fat_g) : undefined,
    unsaturatedFatG: row.unsaturated_fat_g
      ? Number(row.unsaturated_fat_g)
      : undefined,
    sodiumMg: row.sodium_mg ? Number(row.sodium_mg) : undefined,
    potassiumMg: row.potassium_mg ? Number(row.potassium_mg) : undefined,
    calciumMg: row.calcium_mg ? Number(row.calcium_mg) : undefined,
    ironMg: row.iron_mg ? Number(row.iron_mg) : undefined,
    magnesiumMg: row.magnesium_mg ? Number(row.magnesium_mg) : undefined,
    vitaminAMcg: row.vitamin_a_mcg ? Number(row.vitamin_a_mcg) : undefined,
    vitaminCMg: row.vitamin_c_mg ? Number(row.vitamin_c_mg) : undefined,
    vitaminDMcg: row.vitamin_d_mcg ? Number(row.vitamin_d_mcg) : undefined,
    vitaminEMg: row.vitamin_e_mg ? Number(row.vitamin_e_mg) : undefined,
    vitaminKMcg: row.vitamin_k_mcg ? Number(row.vitamin_k_mcg) : undefined,
    vitaminB1Mg: row.vitamin_b1_mg ? Number(row.vitamin_b1_mg) : undefined,
    vitaminB2Mg: row.vitamin_b2_mg ? Number(row.vitamin_b2_mg) : undefined,
    vitaminB3Mg: row.vitamin_b3_mg ? Number(row.vitamin_b3_mg) : undefined,
    vitaminB6Mg: row.vitamin_b6_mg ? Number(row.vitamin_b6_mg) : undefined,
    vitaminB12Mcg: row.vitamin_b12_mcg ? Number(row.vitamin_b12_mcg) : undefined,
    folateMcg: row.folate_mcg ? Number(row.folate_mcg) : undefined,
    zincMg: row.zinc_mg ? Number(row.zinc_mg) : undefined,
    seleniumMcg: row.selenium_mcg ? Number(row.selenium_mcg) : undefined,
    cholesterolMg: row.cholesterol_mg ? Number(row.cholesterol_mg) : undefined,
    aiConfidenceScore: row.ai_confidence_score
      ? Number(row.ai_confidence_score)
      : undefined,
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
    const id = profile.id ?? createId();

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
        profile.expenseItemId,
        profile.source,
        profile.servingSizeG ?? null,
        profile.servingsPerContainer ?? null,
        profile.calories ?? null,
        profile.proteinG ?? null,
        profile.carbsG ?? null,
        profile.fatG ?? null,
        profile.fiberG ?? null,
        profile.sugarG ?? null,
        profile.saturatedFatG ?? null,
        profile.transFatG ?? null,
        profile.unsaturatedFatG ?? null,
        profile.sodiumMg ?? null,
        profile.potassiumMg ?? null,
        profile.calciumMg ?? null,
        profile.ironMg ?? null,
        profile.magnesiumMg ?? null,
        profile.vitaminAMcg ?? null,
        profile.vitaminCMg ?? null,
        profile.vitaminDMcg ?? null,
        profile.vitaminEMg ?? null,
        profile.vitaminKMcg ?? null,
        profile.vitaminB1Mg ?? null,
        profile.vitaminB2Mg ?? null,
        profile.vitaminB3Mg ?? null,
        profile.vitaminB6Mg ?? null,
        profile.vitaminB12Mcg ?? null,
        profile.folateMcg ?? null,
        profile.zincMg ?? null,
        profile.seleniumMcg ?? null,
        profile.cholesterolMg ?? null,
        profile.aiConfidenceScore ?? null,
        profile.rawLabelText ?? null,
        now,
      ],
    );

    return {
      ...profile,
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
        protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      calories: row.calories ? Number(row.calories) : undefined,
      proteinG: row.protein_g ? Number(row.protein_g) : undefined,
      carbsG: row.carbs_g ? Number(row.carbs_g) : undefined,
      fatG: row.fat_g ? Number(row.fat_g) : undefined,
      fiberG: row.fiber_g ? Number(row.fiber_g) : undefined,
      sugarG: row.sugar_g ? Number(row.sugar_g) : undefined,
      sodiumMg: row.sodium_mg ? Number(row.sodium_mg) : undefined,
      createdAt: Number(row.created_at),
    }));
  }
}
