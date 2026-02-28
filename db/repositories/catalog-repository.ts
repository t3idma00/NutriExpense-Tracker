import { getDb } from "@/db/database";
import { createId } from "@/utils/id";
import { normalizeName } from "@/utils/normalize-name";
import type {
  ExpenseCategory,
  NutritionSource,
  ProductCatalog,
  ProductCatalogNutrition,
} from "@/types";
import type { GeminiItemNutrition } from "@/services/receipt-ocr.service";

/* ------------------------------------------------------------------ */
/*  Row mapper                                                         */
/* ------------------------------------------------------------------ */

function mapCatalogRow(row: Record<string, unknown>): ProductCatalog {
  let nutritionJson: ProductCatalogNutrition | undefined;
  if (row.nutrition_json) {
    try {
      nutritionJson = JSON.parse(String(row.nutrition_json));
    } catch { /* ignore bad json */ }
  }

  return {
    id: String(row.id),
    normalizedName: String(row.normalized_name),
    displayName: String(row.display_name),
    displayNameTranslated: row.display_name_translated
      ? String(row.display_name_translated)
      : undefined,
    category: String(row.category) as ExpenseCategory,
    subcategory: row.subcategory ? String(row.subcategory) : undefined,
    brand: row.brand ? String(row.brand) : undefined,
    barcode: row.barcode ? String(row.barcode) : undefined,
    isFood: row.is_food === 1 || row.is_food === true,
    nutritionJson,
    nutritionSource: row.nutrition_source
      ? (String(row.nutrition_source) as NutritionSource)
      : undefined,
    nutritionConfidence: row.nutrition_confidence
      ? Number(row.nutrition_confidence)
      : undefined,
    nutritionUpdatedAt: row.nutrition_updated_at
      ? Number(row.nutrition_updated_at)
      : undefined,
    tags: JSON.parse(String(row.tags ?? "[]")),
    firstSeenAt: Number(row.first_seen_at),
    lastSeenAt: Number(row.last_seen_at),
    purchaseCount: Number(row.purchase_count ?? 1),
    avgPrice: row.avg_price != null ? Number(row.avg_price) : undefined,
    minPrice: row.min_price != null ? Number(row.min_price) : undefined,
    maxPrice: row.max_price != null ? Number(row.max_price) : undefined,
    lastPrice: row.last_price != null ? Number(row.last_price) : undefined,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

/* ------------------------------------------------------------------ */
/*  Nutrition helpers                                                   */
/* ------------------------------------------------------------------ */

function geminiNutritionToJson(
  n: GeminiItemNutrition,
): ProductCatalogNutrition {
  return {
    isFood: n.isFood,
    servingSizeG: n.servingSizeG,
    caloriesPer100g: n.caloriesPer100g,
    proteinGPer100g: n.proteinGPer100g,
    carbsGPer100g: n.carbsGPer100g,
    fatGPer100g: n.fatGPer100g,
    fiberGPer100g: n.fiberGPer100g,
    sugarGPer100g: n.sugarGPer100g,
    sodiumMgPer100g: n.sodiumMgPer100g,
  };
}

/* ------------------------------------------------------------------ */
/*  Repository                                                         */
/* ------------------------------------------------------------------ */

export class CatalogRepository {
  /**
   * The core "universal matching" method.
   * Finds an existing catalog entry or creates a new one.
   * Updates price stats and nutrition on re-purchase.
   */
  async findOrCreate(input: {
    rawName: string;
    category?: ExpenseCategory;
    brand?: string;
    barcode?: string;
    totalPrice: number;
    isFood?: boolean;
    nutrition?: GeminiItemNutrition;
  }): Promise<ProductCatalog> {
    const db = await getDb();
    const normalized = normalizeName(input.rawName);
    if (!normalized) {
      // Fallback: use raw name lowercased
      return this.createNewEntry(input, input.rawName.toLowerCase().trim());
    }

    // 1. Try barcode match first (strongest identity)
    if (input.barcode) {
      const byBarcode = await db.getFirstAsync<Record<string, unknown>>(
        "SELECT * FROM product_catalog WHERE barcode = ? LIMIT 1",
        [input.barcode],
      );
      if (byBarcode) {
        return this.updateOnRepurchase(
          mapCatalogRow(byBarcode),
          input.totalPrice,
          input.nutrition,
        );
      }
    }

    // 2. Try normalized name match
    const byName = await db.getFirstAsync<Record<string, unknown>>(
      "SELECT * FROM product_catalog WHERE normalized_name = ? LIMIT 1",
      [normalized],
    );
    if (byName) {
      return this.updateOnRepurchase(
        mapCatalogRow(byName),
        input.totalPrice,
        input.nutrition,
      );
    }

    // 3. Not found — create new
    return this.createNewEntry(input, normalized);
  }

  private async createNewEntry(
    input: {
      rawName: string;
      category?: ExpenseCategory;
      brand?: string;
      barcode?: string;
      totalPrice: number;
      isFood?: boolean;
      nutrition?: GeminiItemNutrition;
    },
    normalized: string,
  ): Promise<ProductCatalog> {
    const db = await getDb();
    const now = Date.now();
    const id = createId();
    const isFood = input.nutrition
      ? input.nutrition.isFood
      : (input.isFood ?? true);
    const nutritionJson = input.nutrition
      ? geminiNutritionToJson(input.nutrition)
      : undefined;

    await db.runAsync(
      `INSERT INTO product_catalog (
        id, normalized_name, display_name, category, brand, barcode,
        is_food, nutrition_json, nutrition_source, nutrition_confidence, nutrition_updated_at,
        tags, first_seen_at, last_seen_at, purchase_count,
        avg_price, min_price, max_price, last_price,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        normalized,
        input.rawName,
        input.category ?? "grocery",
        input.brand ?? null,
        input.barcode ?? null,
        isFood ? 1 : 0,
        nutritionJson ? JSON.stringify(nutritionJson) : null,
        nutritionJson ? "ai_inferred" : null,
        input.nutrition?.nutritionConfidence ?? null,
        nutritionJson ? now : null,
        "[]",
        now,
        now,
        1,
        input.totalPrice,
        input.totalPrice,
        input.totalPrice,
        input.totalPrice,
        now,
        now,
      ],
    );

    console.log(`[catalog] New product: "${input.rawName}" → ${normalized}`);

    return {
      id,
      normalizedName: normalized,
      displayName: input.rawName,
      category: (input.category ?? "grocery") as ExpenseCategory,
      brand: input.brand,
      barcode: input.barcode,
      isFood,
      nutritionJson,
      nutritionSource: nutritionJson ? "ai_inferred" : undefined,
      nutritionConfidence: input.nutrition?.nutritionConfidence,
      nutritionUpdatedAt: nutritionJson ? now : undefined,
      tags: [],
      firstSeenAt: now,
      lastSeenAt: now,
      purchaseCount: 1,
      avgPrice: input.totalPrice,
      minPrice: input.totalPrice,
      maxPrice: input.totalPrice,
      lastPrice: input.totalPrice,
      createdAt: now,
      updatedAt: now,
    };
  }

  private async updateOnRepurchase(
    existing: ProductCatalog,
    totalPrice: number,
    nutrition?: GeminiItemNutrition,
  ): Promise<ProductCatalog> {
    const db = await getDb();
    const now = Date.now();
    const newCount = existing.purchaseCount + 1;
    const oldAvg = existing.avgPrice ?? totalPrice;
    const newAvg =
      (oldAvg * existing.purchaseCount + totalPrice) / newCount;
    const newMin = Math.min(existing.minPrice ?? totalPrice, totalPrice);
    const newMax = Math.max(existing.maxPrice ?? totalPrice, totalPrice);

    // Upgrade nutrition if new data has higher confidence or existing has none
    let nutritionUpdate = false;
    let updatedNutritionJson = existing.nutritionJson;
    let updatedNutritionConfidence = existing.nutritionConfidence;
    if (nutrition && nutrition.isFood) {
      const newConfidence = nutrition.nutritionConfidence ?? 0.7;
      const existingConfidence = existing.nutritionConfidence ?? 0;
      const isStale = existing.nutritionUpdatedAt
        ? now - existing.nutritionUpdatedAt > 90 * 24 * 60 * 60 * 1000
        : true;

      if (!existing.nutritionJson || newConfidence > existingConfidence || isStale) {
        updatedNutritionJson = geminiNutritionToJson(nutrition);
        updatedNutritionConfidence = newConfidence;
        nutritionUpdate = true;
      }
    }

    await db.runAsync(
      `UPDATE product_catalog SET
        purchase_count = ?,
        last_seen_at = ?,
        avg_price = ?,
        min_price = ?,
        max_price = ?,
        last_price = ?,
        ${nutritionUpdate ? "nutrition_json = ?, nutrition_source = ?, nutrition_confidence = ?, nutrition_updated_at = ?," : ""}
        updated_at = ?
      WHERE id = ?`,
      nutritionUpdate
        ? [
            newCount, now, newAvg, newMin, newMax, totalPrice,
            JSON.stringify(updatedNutritionJson), "ai_inferred",
            updatedNutritionConfidence ?? 0.7, now,
            now, existing.id,
          ]
        : [
            newCount, now, newAvg, newMin, newMax, totalPrice,
            now, existing.id,
          ],
    );

    console.log(
      `[catalog] Repeat purchase: "${existing.displayName}" ` +
      `(#${newCount}, avg: ${newAvg.toFixed(2)})`,
    );

    return {
      ...existing,
      purchaseCount: newCount,
      lastSeenAt: now,
      avgPrice: newAvg,
      minPrice: newMin,
      maxPrice: newMax,
      lastPrice: totalPrice,
      nutritionJson: updatedNutritionJson,
      nutritionConfidence: updatedNutritionConfidence,
      updatedAt: now,
    };
  }

  /* ── Query methods ── */

  async getById(id: string): Promise<ProductCatalog | null> {
    const db = await getDb();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      "SELECT * FROM product_catalog WHERE id = ? LIMIT 1",
      [id],
    );
    return row ? mapCatalogRow(row) : null;
  }

  async getByNormalizedName(name: string): Promise<ProductCatalog | null> {
    const db = await getDb();
    const normalized = normalizeName(name);
    if (!normalized) return null;
    const row = await db.getFirstAsync<Record<string, unknown>>(
      "SELECT * FROM product_catalog WHERE normalized_name = ? LIMIT 1",
      [normalized],
    );
    return row ? mapCatalogRow(row) : null;
  }

  async searchCatalog(
    query: string,
    limit = 20,
  ): Promise<ProductCatalog[]> {
    const db = await getDb();
    const pattern = `%${query.toLowerCase()}%`;
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM product_catalog
       WHERE normalized_name LIKE ? OR display_name LIKE ?
       ORDER BY purchase_count DESC, last_seen_at DESC
       LIMIT ?`,
      [pattern, pattern, limit],
    );
    return rows.map(mapCatalogRow);
  }

  async getTopProducts(limit = 20): Promise<ProductCatalog[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM product_catalog
       ORDER BY purchase_count DESC, last_seen_at DESC
       LIMIT ?`,
      [limit],
    );
    return rows.map(mapCatalogRow);
  }

  /**
   * Returns a compact summary of known products for AI prompt context.
   * Format: { name, category, isFood, hasNutrition, calories }
   * Limited to most-purchased items to keep prompt size manageable.
   */
  async getPromptContext(limit = 100): Promise<
    Array<{
      name: string;
      category: string;
      isFood: boolean;
      hasNutrition: boolean;
      caloriesPer100g?: number;
    }>
  > {
    const db = await getDb();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT display_name, category, is_food, nutrition_json
       FROM product_catalog
       ORDER BY purchase_count DESC, last_seen_at DESC
       LIMIT ?`,
      [limit],
    );
    return rows.map((row) => {
      let caloriesPer100g: number | undefined;
      let hasNutrition = false;
      if (row.nutrition_json) {
        try {
          const n = JSON.parse(String(row.nutrition_json));
          hasNutrition = true;
          caloriesPer100g = n.caloriesPer100g;
        } catch { /* ignore */ }
      }
      return {
        name: String(row.display_name),
        category: String(row.category),
        isFood: row.is_food === 1 || row.is_food === true,
        hasNutrition,
        caloriesPer100g,
      };
    });
  }

  async getPriceHistory(
    catalogId: string,
  ): Promise<Array<{ date: number; price: number; store: string }>> {
    const db = await getDb();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT e.total_price, e.purchase_date, r.store_name
       FROM expense_items e
       JOIN receipts r ON r.id = e.receipt_id
       WHERE e.catalog_id = ?
       ORDER BY e.purchase_date DESC`,
      [catalogId],
    );
    return rows.map((row) => ({
      date: Number(row.purchase_date),
      price: Number(row.total_price),
      store: String(row.store_name ?? ""),
    }));
  }
}
