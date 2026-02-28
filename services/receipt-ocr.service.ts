import * as FileSystem from "expo-file-system/legacy";
import type { ParsedLineItem, ParsedReceipt, ReceiptMeta } from "@/types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

export interface ReceiptOcrExtraction {
  text: string;
  confidence: number;
  source: "gemini_vision";
}

/** Nutrition estimate returned by Gemini for a single item (per 100g). */
export interface GeminiItemNutrition {
  isFood: boolean;
  servingSizeG?: number;
  caloriesPer100g?: number;
  proteinGPer100g?: number;
  carbsGPer100g?: number;
  fatGPer100g?: number;
  fiberGPer100g?: number;
  sugarGPer100g?: number;
  sodiumMgPer100g?: number;
  nutritionConfidence?: number;
}

/** Full structured receipt returned by Gemini Vision. */
export interface GeminiStructuredReceipt {
  header: {
    storeName: string;
    storeAddress?: string;
    phone?: string;
    receiptNumber?: string;
    register?: string;
    cashier?: string;
    date: string;
    time?: string;
  };
  items: Array<{
    name: string;
    description?: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
    originalPrice?: number;
    discount?: number;
    isWeighed: boolean;
    weightKg?: number;
    pricePerKg?: number;
    nutrition?: GeminiItemNutrition;
  }>;
  totals: {
    subtotal: number;
    tax: number;
    totalDiscount: number;
    total: number;
    itemCount: number;
  };
  footer: {
    paymentMethod?: string;
    memberNumber?: string;
    bonusInfo?: string;
  };
  currency: string;
  language: string;
  confidence: number;
  rawText: string;
}

export interface ReceiptOcrAttempt {
  extraction: ReceiptOcrExtraction | null;
  structuredReceipt: GeminiStructuredReceipt | null;
  errorMessage?: string;
}

/* ------------------------------------------------------------------ */
/*  Constants & helpers                                                */
/* ------------------------------------------------------------------ */

const GEMINI_REQUEST_TIMEOUT_MS = 60000;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function uniqueModels(models: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const model of models) {
    const value = model?.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    output.push(value);
  }
  return output;
}

function extractGeminiKey(): string | undefined {
  const key = process.env.EXPO_PUBLIC_GEMINI_API_KEY?.trim();
  return key || undefined;
}

function detectMimeType(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".heic")) return "image/heic";
  return "image/jpeg";
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

function compactErrorMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : String(error);
  if (!message) return fallback;
  return message.length > 260 ? `${message.slice(0, 260)}...` : message;
}

/* ------------------------------------------------------------------ */
/*  The intelligent Gemini prompt — Receipt Anatomy Analysis           */
/* ------------------------------------------------------------------ */

const STRUCTURED_RECEIPT_PROMPT = `You are a world-class receipt analysis AI. Your job is to DEEPLY UNDERSTAND the anatomy of a receipt image and extract perfectly structured data.

═══════════════════════════════════════════════════════════
STEP 1: UNDERSTAND RECEIPT ANATOMY (Zones)
═══════════════════════════════════════════════════════════

Every receipt has these ZONES. Identify each zone FIRST before extracting data:

ZONE A — HEADER (top of receipt):
  - Store/business name (usually largest text, centered)
  - Store address, phone number, website
  - Receipt number, register/terminal ID, cashier name
  - Date and time of purchase
  - Membership/loyalty messages (e.g. "ASIAKASOMISTAJAN edut on huomioitu")
  ⚠ NOTHING in this zone is a purchased item. Numbers here are phone numbers, receipt IDs, dates — NOT prices.

ZONE B — LINE ITEMS (middle, the largest zone):
  - Each purchased product with its PAID PRICE on the right
  - Detail lines BELOW an item (weight, quantity, unit price) — these are supplementary info
  - Discount/campaign lines that modify the item above them
  ⚠ This is the ONLY zone containing purchased items.

ZONE C — TOTALS (after items, often preceded by a line/separator):
  - Subtotal, tax/VAT, grand total
  - Total savings/discount summary
  ⚠ Numbers here are receipt totals — NOT items.

ZONE D — FOOTER (bottom of receipt):
  - Payment method (card type, cash, etc.)
  - Membership/bonus details, member number
  - Bonus transaction IDs
  - "Thank you" messages, return policy
  ⚠ NOTHING here is a purchased item.

═══════════════════════════════════════════════════════════
STEP 2: LINE ITEM PARSING RULES
═══════════════════════════════════════════════════════════

For each item in ZONE B, follow these rules precisely:

RULE 1 — ITEM LINE FORMAT:
  The ITEM LINE contains: [ITEM NAME]  [PAID PRICE on the right]
  Example: "BROCCOLI MIX 1KG              1,94"
  → name="BROCCOLI MIX 1KG", totalPrice=1.94

RULE 2 — WEIGHT DETAIL LINE (appears BELOW an item):
  Format: [weight] KG    [price] €/KG
  Example: "0,125 KG    8,49 €/KG"
  → This means the PREVIOUS item weighs 0.125kg at 8.49€/kg
  → The PAID PRICE is on the PREVIOUS item line (e.g. 1,06), NOT 8.49
  → Set: isWeighed=true, quantity=0.125, unit="kg", unitPrice=8.49, totalPrice=1.06 (from item line)

RULE 3 — QUANTITY DETAIL LINE (appears BELOW an item):
  Format: [count] KPL    [price] €/KPL
  Example: "2 KPL    0,98 €/KPL"
  → This means 2 pieces at 0.98€ each
  → The PAID PRICE is on the PREVIOUS item line (e.g. 1,96)
  → Set: quantity=2, unit="pcs", unitPrice=0.98, totalPrice=1.96 (from item line)

RULE 4 — DISCOUNT/CAMPAIGN LINES:
  "NORM."  + price → the ORIGINAL price before discount
  "KAMPANJA" or "ALENNUS" + negative amount → the discount applied
  Example:
    "SOPU PYÖRYKKA TEXMEX          2,00"    ← item line (FINAL paid price)
    "2 KPL    3,49 €/KPL"                   ← detail (2 pcs at 3.49)
    "NORM.                         6,98"    ← original price before discount
    "KAMPANJA                     -4,98"    ← discount amount
  → name="SOPU PYÖRYKKA TEXMEX", totalPrice=2.00, originalPrice=6.98, discount=4.98

RULE 5 — WHAT IS NOT AN ITEM:
  - Store name, address, phone number
  - Receipt number, register code, date, time
  - "YHTEENSÄ", "TOTAL", "SUMMA" lines (these are totals)
  - "BONUSTA", "JÄSENNUMERO", "KORTTITAPAHTUMA" lines (footer metadata)
  - "ALV", "VERO", "TAX" lines (tax info)
  - Separator lines (dashes, dots, equals)
  - "ASIAKASOMISTAJAN edut..." (loyalty message)
  - Weight/quantity detail lines (they belong to the item above)
  - "NORM." and "KAMPANJA" lines (they modify the item above)

═══════════════════════════════════════════════════════════
STEP 3: OUTPUT FORMAT
═══════════════════════════════════════════════════════════

Return this EXACT JSON structure (all prices as numbers with dot decimal, e.g. 1.94):

{
  "header": {
    "storeName": "Prisma Linnanmaa",
    "storeAddress": "Kauppalinnankuja 1-3, 90570 Oulu",
    "phone": "08-3136100",
    "receiptNumber": "M003315/4936",
    "register": "K005",
    "cashier": null,
    "date": "2026-02-20",
    "time": "16:59"
  },
  "items": [
    {
      "name": "BROCCOLI MIX 1KG",
      "description": null,
      "quantity": 1,
      "unit": "pcs",
      "unitPrice": 1.94,
      "totalPrice": 1.94,
      "originalPrice": null,
      "discount": 0,
      "isWeighed": false,
      "weightKg": null,
      "pricePerKg": null,
      "nutrition": {
        "isFood": true,
        "servingSizeG": 100,
        "caloriesPer100g": 34,
        "proteinGPer100g": 2.8,
        "carbsGPer100g": 7.0,
        "fatGPer100g": 0.4,
        "fiberGPer100g": 2.6,
        "sugarGPer100g": 1.7,
        "sodiumMgPer100g": 33,
        "nutritionConfidence": 0.9
      }
    },
    {
      "name": "IRTONAMUJA",
      "description": "Loose candy by weight",
      "quantity": 0.125,
      "unit": "kg",
      "unitPrice": 8.49,
      "totalPrice": 1.06,
      "originalPrice": null,
      "discount": 0,
      "isWeighed": true,
      "weightKg": 0.125,
      "pricePerKg": 8.49,
      "nutrition": {
        "isFood": true,
        "servingSizeG": 30,
        "caloriesPer100g": 350,
        "proteinGPer100g": 1.5,
        "carbsGPer100g": 80,
        "fatGPer100g": 2.0,
        "sugarGPer100g": 55,
        "sodiumMgPer100g": 20,
        "nutritionConfidence": 0.75
      }
    }
  ],
  "totals": {
    "subtotal": 35.12,
    "tax": 0,
    "totalDiscount": 4.98,
    "total": 35.12,
    "itemCount": 20
  },
  "footer": {
    "paymentMethod": "Card",
    "memberNumber": "****3024",
    "bonusInfo": "Bonustapahtuma 260220054936"
  },
  "currency": "EUR",
  "language": "fi",
  "confidence": 0.95,
  "rawText": "full receipt text here preserving line breaks"
}

═══════════════════════════════════════════════════════════
STEP 4: NUTRITION ESTIMATION (for food items)
═══════════════════════════════════════════════════════════

For EACH item, add a "nutrition" field. This saves a separate API call per item.

If the item IS a food/beverage, estimate nutrition per 100g using your knowledge:
{
  "nutrition": {
    "isFood": true,
    "servingSizeG": 100,
    "caloriesPer100g": 34,
    "proteinGPer100g": 2.8,
    "carbsGPer100g": 7.0,
    "fatGPer100g": 0.4,
    "fiberGPer100g": 2.6,
    "sugarGPer100g": 1.7,
    "sodiumMgPer100g": 33,
    "nutritionConfidence": 0.85
  }
}

If the item is NOT food (cleaning products, bags, household items), set:
{ "nutrition": { "isFood": false } }

Guidelines for accuracy:
- Use your knowledge of common grocery products and their typical nutrition
- For Finnish products: KEVYTMAITO=low-fat milk, KANANMUNA=eggs, PURJO=leek, etc.
- For branded items, estimate based on the product category
- Set nutritionConfidence: 0.9+ for well-known items (milk, eggs, rice, bread)
- Set nutritionConfidence: 0.7-0.85 for reasonable estimates (mixed/processed items)
- Set nutritionConfidence: 0.5-0.7 for uncertain items (vague names)
- All values must be per 100g, using dot decimal notation

═══════════════════════════════════════════════════════════
VALIDATION CHECKLIST (verify before returning)
═══════════════════════════════════════════════════════════

✓ Sum of all item totalPrice values ≈ totals.total (within rounding)
✓ No phone numbers, receipt IDs, or dates appear as item prices
✓ Weight detail lines (€/KG) are NOT separate items — they are part of the item above
✓ Quantity detail lines (€/KPL) are NOT separate items — they are part of the item above
✓ KAMPANJA/discount lines are NOT separate items — they modify the item above
✓ NORM. lines are NOT separate items — they show the original price of the item above
✓ Store name is NOT an item
✓ Total/YHTEENSÄ line is NOT an item
✓ itemCount matches the actual number of items in the array
✓ All prices use dot decimal (1.94 not 1,94)
✓ For weighed items: totalPrice = quantity × unitPrice (approximately)
✓ For quantity items: totalPrice = quantity × unitPrice (approximately)
✓ For discounted items: totalPrice = originalPrice - discount`;

/* ------------------------------------------------------------------ */
/*  Gemini API call                                                    */
/* ------------------------------------------------------------------ */

async function callGemini(input: {
  apiKey: string;
  model: string;
  base64Image: string;
  mimeType: string;
  prompt: string;
  maxTokens?: number;
}): Promise<string> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    input.model,
  )}:generateContent?key=${encodeURIComponent(input.apiKey)}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        system_instruction: {
          parts: [{
            text: "You are a world-class receipt OCR and analysis engine. " +
              "You DEEPLY understand receipt anatomy — headers, line items, totals, footers. " +
              "You never confuse phone numbers, receipt IDs, unit prices, or totals with item prices. " +
              "Return only valid JSON.",
          }],
        },
        contents: [
          {
            role: "user",
            parts: [
              { text: input.prompt },
              {
                inline_data: {
                  mime_type: input.mimeType,
                  data: input.base64Image,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.02,
          maxOutputTokens: input.maxTokens ?? 16384,
          responseMimeType: "application/json",
        },
      }),
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`Gemini timed out after ${GEMINI_REQUEST_TIMEOUT_MS}ms.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Gemini failed (${input.model}): ${response.status} ${details.slice(0, 220)}`,
    );
  }

  const payload = (await response.json()) as GeminiGenerateContentResponse;
  const text = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("\n")
    .trim();
  if (!text) {
    throw new Error(`Gemini returned empty response (${input.model}).`);
  }
  return text;
}

/* ------------------------------------------------------------------ */
/*  Conversion: Gemini structured → ParsedReceipt                      */
/* ------------------------------------------------------------------ */

function normalizeUnit(raw: string): "kg" | "g" | "lb" | "oz" | "L" | "ml" | "pcs" | "pack" {
  const lower = (raw ?? "pcs").toLowerCase().trim();
  if (lower === "kg") return "kg";
  if (lower === "g") return "g";
  if (lower === "lb") return "lb";
  if (lower === "oz") return "oz";
  if (lower === "l" || lower === "ltr") return "L";
  if (lower === "ml") return "ml";
  if (lower === "pack") return "pack";
  return "pcs";
}

function confidenceBand(value: number): "high" | "medium" | "low" {
  if (value >= 0.9) return "high";
  if (value >= 0.6) return "medium";
  return "low";
}

function parseIsoDate(dateStr: string): number {
  if (!dateStr) return Date.now();
  const parsed = new Date(dateStr);
  if (!Number.isNaN(parsed.getTime())) return parsed.getTime();
  const parts = dateStr.match(/(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2,4})/);
  if (parts) {
    const [, d, m, y] = parts;
    const fullYear = y.length === 2 ? `20${y}` : y;
    const attempt = new Date(`${fullYear}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
    if (!Number.isNaN(attempt.getTime())) return attempt.getTime();
  }
  return Date.now();
}

/**
 * Post-processing safety net: remove entries that are clearly NOT purchased items.
 * Gemini sometimes still leaks totals, footer data, or metadata lines as items.
 */
const NON_ITEM_PATTERNS = [
  // Totals & subtotals
  /^yhteens[äa]/i, /^total$/i, /^summa$/i, /^subtotal$/i,
  // Tax
  /^alv\b/i, /^vero\b/i, /^tax\b/i, /^vat\b/i,
  // Discounts (should be merged into an item, not standalone)
  /^kampanja$/i, /^alennus$/i, /^norm\.?$/i,
  // Payment & footer
  /^korttitapahtuma/i, /^k[äa]teinen/i, /^maksukortti/i,
  /^credit\s?card/i, /^debit\s?card/i, /^visa\b/i, /^mastercard\b/i,
  // Bonus/loyalty lines
  /^bonusta?\b/i, /^bonus\s/i, /^bonustapahtuma/i,
  /^j[äa]sennumero/i, /^membership/i,
  // Receipt metadata
  /^asiakasomistaj/i, /^kuitti\b/i, /^receipt\b/i,
  // Change/cash back
  /^vaihtor/i, /^change\b/i,
];

function isNonItemEntry(name: string, totalPrice: number): boolean {
  const trimmed = name.trim();
  if (!trimmed) return true;
  if (NON_ITEM_PATTERNS.some((p) => p.test(trimmed))) return true;
  if (totalPrice > 999999) return true;
  return false;
}

export function convertGeminiReceiptToParsed(
  g: GeminiStructuredReceipt,
): ParsedReceipt {
  const items: ParsedLineItem[] = g.items
    .filter((item) => !isNonItemEntry(item.name, item.totalPrice ?? 0))
    .map((item) => {
      const totalPrice = Math.abs(item.totalPrice ?? 0);
      const quantity = item.quantity > 0 ? item.quantity : 1;
      const unitPrice = item.unitPrice > 0 ? item.unitPrice : totalPrice / quantity;
      const conf = clamp(g.confidence ?? 0.85, 0.5, 0.99);

      return {
        rawName: item.name,
        quantity,
        unit: normalizeUnit(item.unit),
        unitPrice,
        totalPrice,
        originalPrice: item.originalPrice && item.originalPrice > totalPrice
          ? item.originalPrice
          : undefined,
        discount: item.discount && item.discount > 0 ? item.discount : undefined,
        isWeighed: item.isWeighed || false,
        confidence: conf,
        confidenceBand: confidenceBand(conf),
      };
    });

  const total = g.totals?.total > 0 ? g.totals.total : items.reduce((s, i) => s + i.totalPrice, 0);
  const subtotal = g.totals?.subtotal > 0 ? g.totals.subtotal : total;
  const tax = g.totals?.tax >= 0 ? g.totals.tax : 0;

  const sumItems = items.reduce((s, i) => s + i.totalPrice, 0);
  const variance = total > 0 ? Math.abs(sumItems - total) / total : 0;
  const overallConfidence = clamp((g.confidence ?? 0.85) * (1 - variance * 0.5), 0.45, 0.99);

  const meta: ReceiptMeta = {
    receiptNumber: g.header?.receiptNumber || undefined,
    time: g.header?.time || undefined,
    phone: g.header?.phone || undefined,
    storeAddress: g.header?.storeAddress || undefined,
    cashier: g.header?.cashier || undefined,
    register: g.header?.register || undefined,
    paymentMethod: g.footer?.paymentMethod || undefined,
    memberNumber: g.footer?.memberNumber || undefined,
    bonusInfo: g.footer?.bonusInfo || undefined,
    totalDiscount: g.totals?.totalDiscount > 0 ? g.totals.totalDiscount : undefined,
    itemCount: items.length,
  };

  return {
    storeName: g.header?.storeName || "Unknown Store",
    date: parseIsoDate(g.header?.date),
    currency: g.currency || "EUR",
    detectedLanguage: g.language || "en",
    items,
    subtotal,
    tax,
    total,
    confidence: overallConfidence,
    rawText: g.rawText || "",
    meta,
  };
}

/* ------------------------------------------------------------------ */
/*  Structured extraction via Gemini Vision                            */
/* ------------------------------------------------------------------ */

async function extractStructuredReceiptViaGemini(
  imageUri: string,
): Promise<ReceiptOcrAttempt> {
  const apiKey = extractGeminiKey();
  console.log(`[receipt-ocr] Gemini API key present: ${Boolean(apiKey)}`);
  if (!apiKey) {
    return {
      extraction: null,
      structuredReceipt: null,
      errorMessage: "Gemini unavailable: EXPO_PUBLIC_GEMINI_API_KEY missing.",
    };
  }

  let base64Image: string;
  try {
    base64Image = await FileSystem.readAsStringAsync(imageUri, {
      encoding: "base64",
    });
  } catch (error) {
    return {
      extraction: null,
      structuredReceipt: null,
      errorMessage: compactErrorMessage(error, "Could not read captured image."),
    };
  }

  if (!base64Image) {
    return {
      extraction: null,
      structuredReceipt: null,
      errorMessage: "Captured image was empty.",
    };
  }

  const mimeType = detectMimeType(imageUri);
  const models = uniqueModels([
    process.env.EXPO_PUBLIC_GEMINI_MODEL?.trim(),
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-001",
  ]);

  let lastError = "Gemini could not parse this receipt image.";

  for (const model of models) {
    try {
      console.log(`[receipt-ocr] Trying Gemini model: ${model}, image size: ${base64Image.length} chars`);
      const raw = await callGemini({
        apiKey,
        model,
        base64Image,
        mimeType,
        prompt: STRUCTURED_RECEIPT_PROMPT,
        maxTokens: 16384,
      });
      console.log(`[receipt-ocr] Gemini (${model}) responded, parsing structured receipt...`);

      const json = extractJsonFromText(raw) as GeminiStructuredReceipt;

      if (!json.items || !Array.isArray(json.items) || json.items.length === 0) {
        lastError = `Gemini (${model}) returned no items.`;
        console.log(`[receipt-ocr] ${lastError}`);
        continue;
      }

      if (typeof json.confidence !== "number") {
        json.confidence = 0.85;
      }
      json.confidence = clamp(json.confidence, 0.35, 0.99);

      const sumItems = json.items.reduce((s, i) => s + (i.totalPrice ?? 0), 0);
      const reportedTotal = json.totals?.total ?? 0;
      const variance = reportedTotal > 0 ? Math.abs(sumItems - reportedTotal) / reportedTotal : 0;

      console.log(
        `[receipt-ocr] Gemini (${model}) extracted ${json.items.length} items | ` +
        `store: ${json.header?.storeName} | total: ${reportedTotal} | ` +
        `items sum: ${sumItems.toFixed(2)} | variance: ${(variance * 100).toFixed(1)}% | ` +
        `confidence: ${json.confidence}`,
      );

      if (variance > 0.15) {
        console.warn(
          `[receipt-ocr] WARNING: Item sum (${sumItems.toFixed(2)}) differs from ` +
          `total (${reportedTotal}) by ${(variance * 100).toFixed(1)}%. ` +
          `Possible parsing error — some items may be misidentified.`,
        );
      }

      return {
        extraction: {
          text: json.rawText || "",
          confidence: json.confidence,
          source: "gemini_vision",
        },
        structuredReceipt: json,
      };
    } catch (error) {
      lastError = compactErrorMessage(error, `Gemini failed (${model}).`);
      console.warn(`[receipt-ocr] ${lastError}`);
    }
  }

  return {
    extraction: null,
    structuredReceipt: null,
    errorMessage: lastError,
  };
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export function isCloudReceiptOcrEnabled(): boolean {
  return Boolean(extractGeminiKey());
}

export async function extractReceiptTextFromImage(
  imageUri: string,
): Promise<ReceiptOcrAttempt> {
  const attempt = await extractStructuredReceiptViaGemini(imageUri);
  if (attempt.structuredReceipt || attempt.extraction) return attempt;

  return {
    extraction: null,
    structuredReceipt: null,
    errorMessage: attempt.errorMessage || "Cloud OCR failed.",
  };
}
