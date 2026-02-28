import { getDb } from "@/db/database";
import { repositories } from "@/db/repositories";
import type { NutritionProfile } from "@/types";
import type { GeminiItemNutrition } from "@/services/receipt-ocr.service";

/* ------------------------------------------------------------------ */
/*  Nutrition name cache (SQLite)                                      */
/* ------------------------------------------------------------------ */

interface CachedNutrition {
  servingSizeG: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG?: number;
  sugarG?: number;
  sodiumMg?: number;
  confidence: number;
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\d+\s*(kg|g|ml|l|cl|dl|pcs|kpl|pack)\b/gi, "")
    .replace(/[^a-zäöüåæø\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function getCachedNutrition(name: string): Promise<CachedNutrition | null> {
  const db = await getDb();
  const key = normalizeName(name);
  if (!key) return null;

  const row = await db.getFirstAsync<{ payload_json: string; updated_at: number }>(
    "SELECT payload_json, updated_at FROM nutrition_name_cache WHERE normalized_name = ?",
    [key],
  );
  if (!row) return null;

  // 90-day TTL
  if (Date.now() - row.updated_at > 90 * 24 * 60 * 60 * 1000) return null;

  // Bump hit count
  void db.runAsync(
    "UPDATE nutrition_name_cache SET hit_count = hit_count + 1 WHERE normalized_name = ?",
    [key],
  );

  try {
    return JSON.parse(row.payload_json) as CachedNutrition;
  } catch {
    return null;
  }
}

async function cacheNutrition(
  name: string,
  payload: CachedNutrition,
  source: string,
): Promise<void> {
  const db = await getDb();
  const key = normalizeName(name);
  if (!key) return;

  await db.runAsync(
    `INSERT OR REPLACE INTO nutrition_name_cache
      (normalized_name, payload_json, source, confidence, hit_count, updated_at)
     VALUES (?, ?, ?, ?, COALESCE((SELECT hit_count FROM nutrition_name_cache WHERE normalized_name = ?), 0) + 1, ?)`,
    [key, JSON.stringify(payload), source, payload.confidence, key, Date.now()],
  );
}

/* ------------------------------------------------------------------ */
/*  Convert Gemini nutrition to CachedNutrition                        */
/* ------------------------------------------------------------------ */

function geminiNutritionToCached(n: GeminiItemNutrition): CachedNutrition | null {
  if (!n.isFood) return null;
  if (!n.caloriesPer100g && n.caloriesPer100g !== 0) return null;

  return {
    servingSizeG: n.servingSizeG ?? 100,
    calories: n.caloriesPer100g ?? 0,
    proteinG: n.proteinGPer100g ?? 0,
    carbsG: n.carbsGPer100g ?? 0,
    fatG: n.fatGPer100g ?? 0,
    fiberG: n.fiberGPer100g,
    sugarG: n.sugarGPer100g,
    sodiumMg: n.sodiumMgPer100g,
    confidence: n.nutritionConfidence ?? 0.7,
  };
}

/* ------------------------------------------------------------------ */
/*  Public: Auto-save nutrition profiles after receipt save             */
/* ------------------------------------------------------------------ */

export interface AutoNutritionResult {
  totalItems: number;
  foodItems: number;
  fromCache: number;
  fromGemini: number;
  skipped: number;
}

/**
 * After a receipt is saved, call this with the saved expense items and the
 * Gemini structured receipt to auto-create nutrition profiles.
 *
 * Flow per item:
 * 1. Check SQLite name cache → if hit, use cached values (zero API calls)
 * 2. If Gemini returned nutrition in the receipt response → use it + cache it
 * 3. Skip non-food items
 */
export async function autoSaveNutritionForReceipt(input: {
  savedItems: Array<{ id: string; name: string }>;
  geminiItems: Array<{ name: string; nutrition?: GeminiItemNutrition }>;
}): Promise<AutoNutritionResult> {
  const result: AutoNutritionResult = {
    totalItems: input.savedItems.length,
    foodItems: 0,
    fromCache: 0,
    fromGemini: 0,
    skipped: 0,
  };

  // Build a lookup from name → Gemini nutrition
  const geminiLookup = new Map<string, GeminiItemNutrition>();
  for (const gi of input.geminiItems) {
    if (gi.nutrition) {
      geminiLookup.set(gi.name.toLowerCase().trim(), gi.nutrition);
    }
  }

  for (const item of input.savedItems) {
    try {
      // 1. Check local cache first
      const cached = await getCachedNutrition(item.name);
      if (cached) {
        result.foodItems++;
        result.fromCache++;
        await saveNutritionProfile(item.id, cached, "ai_inferred");
        console.log(`[auto-nutrition] ${item.name} → from cache`);
        continue;
      }

      // 2. Check Gemini receipt response
      const geminiNutrition = geminiLookup.get(item.name.toLowerCase().trim());
      if (geminiNutrition) {
        if (!geminiNutrition.isFood) {
          result.skipped++;
          console.log(`[auto-nutrition] ${item.name} → not food, skipped`);
          continue;
        }

        const converted = geminiNutritionToCached(geminiNutrition);
        if (converted) {
          result.foodItems++;
          result.fromGemini++;
          await saveNutritionProfile(item.id, converted, "ai_inferred");
          await cacheNutrition(item.name, converted, "ai_inferred");
          console.log(`[auto-nutrition] ${item.name} → from Gemini receipt response, cached`);
          continue;
        }
      }

      result.skipped++;
    } catch (error) {
      console.warn(`[auto-nutrition] Failed for ${item.name}:`, error);
      result.skipped++;
    }
  }

  console.log(
    `[auto-nutrition] Done: ${result.foodItems} food items ` +
    `(${result.fromCache} cached, ${result.fromGemini} from Gemini), ` +
    `${result.skipped} skipped`,
  );

  return result;
}

async function saveNutritionProfile(
  expenseItemId: string,
  nutrition: CachedNutrition,
  source: "ai_inferred" | "barcode_api" | "label_scan" | "manual",
): Promise<void> {
  const profile: Omit<NutritionProfile, "id" | "createdAt"> = {
    expenseItemId,
    source,
    servingSizeG: nutrition.servingSizeG,
    calories: nutrition.calories,
    proteinG: nutrition.proteinG,
    carbsG: nutrition.carbsG,
    fatG: nutrition.fatG,
    fiberG: nutrition.fiberG,
    sugarG: nutrition.sugarG,
    sodiumMg: nutrition.sodiumMg,
    aiConfidenceScore: nutrition.confidence,
  };

  await repositories.nutrition.upsertNutritionProfile(profile);
}
