import { repositories } from "@/db/repositories";
import type { NutritionProfile } from "@/types";
import type { GeminiItemNutrition } from "@/services/receipt-ocr.service";
import { normalizeName } from "@/utils/normalize-name";

/* ------------------------------------------------------------------ */
/*  Public: Auto-save nutrition profiles after receipt save             */
/* ------------------------------------------------------------------ */

export interface AutoNutritionResult {
  totalItems: number;
  foodItems: number;
  fromCatalog: number;
  fromGemini: number;
  skipped: number;
}

/**
 * After a receipt is saved, call this with the saved expense items and the
 * Gemini structured receipt to auto-create nutrition profiles.
 *
 * Flow per item:
 * 1. Check product_catalog for existing nutrition → use it (zero API calls)
 * 2. If Gemini returned nutrition in the receipt response → use it
 * 3. Skip non-food items
 */
export async function autoSaveNutritionForReceipt(input: {
  savedItems: Array<{ id: string; name: string; catalogId?: string }>;
  geminiItems: Array<{ name: string; nutrition?: GeminiItemNutrition }>;
}): Promise<AutoNutritionResult> {
  const result: AutoNutritionResult = {
    totalItems: input.savedItems.length,
    foodItems: 0,
    fromCatalog: 0,
    fromGemini: 0,
    skipped: 0,
  };

  // Build a lookup from normalized name → Gemini nutrition
  const geminiLookup = new Map<string, GeminiItemNutrition>();
  for (const gi of input.geminiItems) {
    if (gi.nutrition) {
      geminiLookup.set(normalizeName(gi.name), gi.nutrition);
    }
  }

  for (const item of input.savedItems) {
    try {
      const normalized = normalizeName(item.name);

      // 1. Check product catalog for existing nutrition
      if (item.catalogId) {
        const catalog = await repositories.catalog.getById(item.catalogId);
        if (catalog?.nutritionJson && catalog.nutritionJson.isFood) {
          result.foodItems++;
          result.fromCatalog++;
          await saveNutritionFromCatalog(
            item.id,
            catalog.nutritionJson,
            catalog.nutritionConfidence ?? 0.7,
          );
          console.log(`[auto-nutrition] ${item.name} → from catalog`);
          continue;
        }
        if (catalog?.nutritionJson && !catalog.nutritionJson.isFood) {
          result.skipped++;
          console.log(`[auto-nutrition] ${item.name} → not food (catalog), skipped`);
          continue;
        }
      }

      // 2. Check Gemini receipt response
      const geminiNutrition = geminiLookup.get(normalized);
      if (geminiNutrition) {
        if (!geminiNutrition.isFood) {
          result.skipped++;
          console.log(`[auto-nutrition] ${item.name} → not food, skipped`);
          continue;
        }

        result.foodItems++;
        result.fromGemini++;
        await saveNutritionFromGemini(item.id, geminiNutrition);
        console.log(`[auto-nutrition] ${item.name} → from Gemini receipt response`);
        continue;
      }

      result.skipped++;
    } catch (error) {
      console.warn(`[auto-nutrition] Failed for ${item.name}:`, error);
      result.skipped++;
    }
  }

  console.log(
    `[auto-nutrition] Done: ${result.foodItems} food items ` +
    `(${result.fromCatalog} from catalog, ${result.fromGemini} from Gemini), ` +
    `${result.skipped} skipped`,
  );

  return result;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

async function saveNutritionFromCatalog(
  expenseItemId: string,
  nutrition: Record<string, unknown>,
  confidence: number,
): Promise<void> {
  const profile: Omit<NutritionProfile, "id" | "createdAt"> = {
    expenseItemId,
    source: "ai_inferred",
    servingSizeG: Number(nutrition.servingSizeG ?? 100),
    calories: Number(nutrition.caloriesPer100g ?? 0),
    proteinG: Number(nutrition.proteinGPer100g ?? 0),
    carbsG: Number(nutrition.carbsGPer100g ?? 0),
    fatG: Number(nutrition.fatGPer100g ?? 0),
    fiberG: nutrition.fiberGPer100g != null ? Number(nutrition.fiberGPer100g) : undefined,
    sugarG: nutrition.sugarGPer100g != null ? Number(nutrition.sugarGPer100g) : undefined,
    sodiumMg: nutrition.sodiumMgPer100g != null ? Number(nutrition.sodiumMgPer100g) : undefined,
    cholesterolMg: nutrition.cholesterolMgPer100g != null
      ? Number(nutrition.cholesterolMgPer100g)
      : undefined,
    aiConfidenceScore: confidence,
  };

  await repositories.nutrition.upsertNutritionProfile(profile);
}

async function saveNutritionFromGemini(
  expenseItemId: string,
  n: GeminiItemNutrition,
): Promise<void> {
  const profile: Omit<NutritionProfile, "id" | "createdAt"> = {
    expenseItemId,
    source: "ai_inferred",
    servingSizeG: n.servingSizeG ?? 100,
    calories: n.caloriesPer100g ?? 0,
    proteinG: n.proteinGPer100g ?? 0,
    carbsG: n.carbsGPer100g ?? 0,
    fatG: n.fatGPer100g ?? 0,
    fiberG: n.fiberGPer100g,
    sugarG: n.sugarGPer100g,
    sodiumMg: n.sodiumMgPer100g,
    aiConfidenceScore: n.nutritionConfidence ?? 0.7,
  };

  await repositories.nutrition.upsertNutritionProfile(profile);
}
