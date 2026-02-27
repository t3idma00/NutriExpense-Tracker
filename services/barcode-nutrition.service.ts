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

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
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

function normalizeBarcode(value: string): string {
  return value.replace(/[^\d]/g, "");
}

function validBarcode(value: string): boolean {
  return value.length >= 8 && value.length <= 14;
}

function extractBarcodeCandidatesFromText(rawText: string): string[] {
  if (!rawText.trim()) return [];

  const candidates = new Set<string>();
  const directMatches = rawText.match(/\b\d{8,14}\b/g) ?? [];
  for (const entry of directMatches) {
    const normalized = normalizeBarcode(entry);
    if (validBarcode(normalized)) candidates.add(normalized);
  }

  const looseMatches = rawText.match(/\d[\d\s-]{7,20}\d/g) ?? [];
  for (const entry of looseMatches) {
    const normalized = normalizeBarcode(entry);
    if (validBarcode(normalized)) candidates.add(normalized);
  }

  return [...candidates];
}

function extractJsonFromText(rawText: string): unknown {
  const fenced = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? rawText).trim();
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1));
    }
    throw new Error("Gemini response did not contain valid JSON.");
  }
}

async function extractBarcodeViaGemini(rawText: string): Promise<string | null> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY?.trim();
  if (!apiKey || !rawText.trim()) return null;

  const models = [
    process.env.EXPO_PUBLIC_GEMINI_MODEL?.trim(),
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-001",
    "gemini-2.0-flash-lite-001",
  ].filter((entry): entry is string => Boolean(entry));

  for (const model of models) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model,
      )}:generateContent?key=${encodeURIComponent(apiKey)}`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text:
                    "Extract the most likely UPC/EAN barcode from this OCR label text. " +
                    'Return JSON only: {"barcode":"digits-or-empty"}',
                },
                { text: rawText.slice(0, 3500) },
              ],
            },
          ],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 120,
            responseMimeType: "application/json",
          },
        }),
      });

      if (!response.ok) continue;
      const payload = (await response.json()) as GeminiGenerateContentResponse;
      const text = payload.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? "")
        .join("\n")
        .trim();
      if (!text) continue;

      const json = extractJsonFromText(text) as { barcode?: string };
      const normalized = normalizeBarcode(json.barcode ?? "");
      if (validBarcode(normalized)) return normalized;
    } catch {
      // Try next model candidate.
    }
  }

  return null;
}

export async function resolveBarcodeFromInput(input: {
  barcodeRaw?: string;
  rawText?: string;
}): Promise<string | null> {
  const typed = normalizeBarcode(input.barcodeRaw ?? "");
  if (validBarcode(typed)) return typed;

  const fromText = extractBarcodeCandidatesFromText(input.rawText ?? "");
  if (fromText.length) return fromText[0];

  return extractBarcodeViaGemini(input.rawText ?? "");
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
  const barcode = normalizeBarcode(barcodeRaw);
  if (!validBarcode(barcode)) return null;

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
