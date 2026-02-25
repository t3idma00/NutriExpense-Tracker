import { getDb } from "@/db/database";

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface CachedPayload {
  payload: BarcodeNutritionResult;
  updatedAt: number;
}

export interface BarcodeNutritionResult {
  barcode: string;
  productName?: string;
  brand?: string;
  servingSizeG?: number;
  calories?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  fiberG?: number;
  sugarG?: number;
  sodiumMg?: number;
  confidence: number;
}

function parseNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toMgFromGrams(value: unknown): number | undefined {
  const grams = parseNumber(value);
  if (typeof grams !== "number") return undefined;
  return grams * 1000;
}

async function getCached(barcode: string): Promise<BarcodeNutritionResult | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    "SELECT payload_json, updated_at FROM barcode_nutrition_cache WHERE barcode = ? LIMIT 1",
    [barcode],
  );
  if (!row?.payload_json || !row.updated_at) return null;

  const updatedAt = Number(row.updated_at);
  if (Date.now() - updatedAt > CACHE_TTL_MS) return null;

  try {
    const parsed = JSON.parse(String(row.payload_json)) as CachedPayload;
    return parsed.payload ?? null;
  } catch {
    return null;
  }
}

async function setCached(barcode: string, payload: BarcodeNutritionResult): Promise<void> {
  const db = await getDb();
  const record: CachedPayload = {
    payload,
    updatedAt: Date.now(),
  };
  await db.runAsync(
    `INSERT INTO barcode_nutrition_cache (barcode, payload_json, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(barcode)
     DO UPDATE SET payload_json = excluded.payload_json, updated_at = excluded.updated_at`,
    [barcode, JSON.stringify(record), record.updatedAt],
  );
}

export async function lookupNutritionByBarcode(barcodeRaw: string): Promise<BarcodeNutritionResult | null> {
  const barcode = barcodeRaw.trim();
  if (!barcode) return null;

  const cached = await getCached(barcode);
  if (cached) return cached;

  const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
  if (!response.ok) return null;

  const payload = (await response.json()) as {
    status?: number;
    product?: {
      product_name?: string;
      brands?: string;
      serving_quantity?: number;
      nutriments?: Record<string, unknown>;
    };
  };

  if (payload.status !== 1 || !payload.product?.nutriments) return null;
  const nutriments = payload.product.nutriments;

  const result: BarcodeNutritionResult = {
    barcode,
    productName: payload.product.product_name,
    brand: payload.product.brands,
    servingSizeG: parseNumber(payload.product.serving_quantity) ?? 100,
    calories: parseNumber(nutriments["energy-kcal_serving"]) ?? parseNumber(nutriments["energy-kcal_100g"]),
    proteinG: parseNumber(nutriments.proteins_serving) ?? parseNumber(nutriments.proteins_100g),
    carbsG: parseNumber(nutriments.carbohydrates_serving) ?? parseNumber(nutriments.carbohydrates_100g),
    fatG: parseNumber(nutriments.fat_serving) ?? parseNumber(nutriments.fat_100g),
    fiberG: parseNumber(nutriments.fiber_serving) ?? parseNumber(nutriments.fiber_100g),
    sugarG: parseNumber(nutriments.sugars_serving) ?? parseNumber(nutriments.sugars_100g),
    sodiumMg: toMgFromGrams(nutriments.sodium_serving) ?? toMgFromGrams(nutriments.sodium_100g),
    confidence: 0.93,
  };

  await setCached(barcode, result);
  return result;
}
