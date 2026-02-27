import { z } from "zod";
import type { ParsedReceipt, Unit } from "@/types";

const currencySymbolMap: Record<string, string> = {
  "$": "USD",
  "\u20AC": "EUR",
  EUR: "EUR",
  GBP: "GBP",
  JPY: "JPY",
  INR: "INR",
  AUD: "AUD",
  CAD: "CAD",
  "\u00A3": "GBP",
  "\u00A5": "JPY",
  "\u20B9": "INR",
  // Legacy mojibake fallbacks from OCR outputs.
  "â‚¬": "EUR",
  "Â£": "GBP",
  "Â¥": "JPY",
  "â‚¹": "INR",
};

const lineItemPattern =
  /^(?<name>[A-Za-z0-9\u00C0-\u024F\s\-\.,&()'%/]+?)\s+(?<price>(?:[$\u20AC\u00A3\u00A5]\s*)?-?\d+(?:[\.,]\d{2})?(?:\s*[$\u20AC\u00A3\u00A5])?)$/u;
const qtyPattern = /(?<qty>\d+(?:[.,]\d+)?)\s?(x|@|\*|kpl|pcs|pack)/iu;

const parsedLineItemSchema = z.object({
  rawName: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.enum(["kg", "g", "lb", "oz", "L", "ml", "pcs", "pack"]),
  unitPrice: z.number().nonnegative(),
  totalPrice: z.number().nonnegative(),
  confidence: z.number().min(0).max(1),
  confidenceBand: z.enum(["high", "medium", "low"]).optional(),
});

const parsedReceiptSchema = z.object({
  storeName: z.string().min(1),
  date: z.number(),
  currency: z.string().min(3),
  detectedLanguage: z.string().min(2),
  items: z.array(parsedLineItemSchema).min(1),
  subtotal: z.number().nonnegative(),
  tax: z.number().nonnegative(),
  total: z.number().nonnegative(),
  confidence: z.number().min(0).max(1),
  rawText: z.string(),
});

function detectCurrency(text: string): string {
  const upper = text.toUpperCase();
  const symbol = Object.keys(currencySymbolMap).find(
    (key) => text.includes(key) || upper.includes(key),
  );
  return symbol ? currencySymbolMap[symbol] : "USD";
}

function parseDate(text: string): number {
  const patterns = [
    /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/,
    /\b(\d{1,2})\.(\d{1,2})\.(\d{2,4})\b/,
    /\b([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})\b/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const parsed = new Date(match[0]);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.getTime();
    }
  }

  return Date.now();
}

function parseDecimal(value: string): number {
  const raw = value.replace(/[^\d,.-]/g, "");
  if (!raw) return 0;

  const commaIndex = raw.lastIndexOf(",");
  const dotIndex = raw.lastIndexOf(".");

  let normalized = raw;
  if (commaIndex >= 0 && dotIndex >= 0) {
    if (commaIndex > dotIndex) {
      normalized = raw.replace(/\./g, "").replace(/,/g, ".");
    } else {
      normalized = raw.replace(/,/g, "");
    }
  } else if (commaIndex >= 0) {
    normalized = raw.replace(/,/g, ".");
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseAmount(line: string): number | null {
  const match = line.match(/(-?\d+(?:[\.,]\d{2})?)/g);
  if (!match?.length) return null;
  const value = parseDecimal(match[match.length - 1]);
  return Number.isFinite(value) ? value : null;
}

function detectUnit(rawName: string): Unit {
  if (/\bkg\b/i.test(rawName)) return "kg";
  if (/\bg\b/i.test(rawName)) return "g";
  if (/\blb\b/i.test(rawName)) return "lb";
  if (/\boz\b/i.test(rawName)) return "oz";
  if (/\bml\b/i.test(rawName)) return "ml";
  if (/\bl\b/i.test(rawName)) return "L";
  if (/\bpack\b/i.test(rawName)) return "pack";
  return "pcs";
}

function confidenceBand(value: number): "high" | "medium" | "low" {
  if (value >= 0.9) return "high";
  if (value >= 0.6) return "medium";
  return "low";
}

function extractItems(lines: string[]) {
  const items: ParsedReceipt["items"] = [];

  for (const line of lines) {
    const clean = line.trim();
    if (!clean) continue;
    if (/subtotal|tax|total|change|cash|visa|master|amex|yhteensa|summa|alv|kampanja|norm\./i.test(clean)) {
      continue;
    }

    const match = clean.match(lineItemPattern);
    if (!match?.groups) continue;

    const rawName = match.groups.name.trim();
    const price = parseDecimal(match.groups.price);
    if (!rawName || !Number.isFinite(price)) continue;

    const qtyMatch = rawName.match(qtyPattern);
    const quantity = qtyMatch?.groups?.qty ? parseDecimal(qtyMatch.groups.qty) : 1;
    const unit: Unit = detectUnit(rawName);
    const unitPrice = quantity > 0 ? price / quantity : price;
    const confidence = Math.min(
      0.97,
      0.62 + (qtyMatch ? 0.1 : 0) + (price > 0 ? 0.15 : 0) + (rawName.length > 4 ? 0.08 : 0),
    );

    items.push({
      rawName: rawName
        .replace(qtyPattern, "")
        .replace(/[\u20AC$\u00A3\u00A5]\s*\/\s*[A-Za-z]+/g, "")
        .trim(),
      quantity: quantity > 0 ? quantity : 1,
      unit,
      unitPrice,
      totalPrice: price,
      confidence,
      confidenceBand: confidenceBand(confidence),
    });
  }

  return items;
}

export function parseReceiptText(rawText: string): ParsedReceipt {
  const normalized = rawText.replace(/\r/g, "");
  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const storeName = lines[0] ?? "Unknown Store";
  const date = parseDate(normalized);
  const currency = detectCurrency(normalized);
  const items = extractItems(lines);

  let subtotal = 0;
  let tax = 0;
  let total = 0;

  for (const line of lines) {
    const amount = parseAmount(line);
    if (amount === null) continue;

    if (/subtotal|summa/i.test(line)) subtotal = amount;
    if (/tax|alv/i.test(line)) tax = amount;
    if (/total|yhteensa/i.test(line)) total = Math.max(total, amount);
  }

  if (!subtotal) subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  if (!total) total = subtotal + tax;

  const sumItems = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const variance = total > 0 ? Math.abs(sumItems - total) / total : 0;
  const confidence = Math.max(0.45, 0.95 - variance);

  const parsed: ParsedReceipt = {
    storeName,
    date,
    currency,
    detectedLanguage: "en",
    items,
    subtotal,
    tax,
    total,
    confidence,
    rawText: normalized,
  };

  return parsedReceiptSchema.parse(parsed);
}
