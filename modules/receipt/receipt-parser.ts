import { z } from "zod";
import type { ParsedReceipt, Unit } from "@/types";

const currencySymbolMap: Record<string, string> = {
  $: "USD",
  "€": "EUR",
  "£": "GBP",
  "¥": "JPY",
  "₹": "INR",
};

const lineItemPattern =
  /^(?<name>[A-Za-z0-9\s\-\.,&()'%/]+?)\s+(?<price>\$?\d+(?:[\.,]\d{2})?)$/;
const qtyPattern = /(?<qty>\d+(?:\.\d+)?)\s?(x|@|\*)/i;

const parsedLineItemSchema = z.object({
  rawName: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.enum(["kg", "g", "lb", "oz", "L", "ml", "pcs", "pack"]),
  unitPrice: z.number().nonnegative(),
  totalPrice: z.number().nonnegative(),
  confidence: z.number().min(0).max(1),
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
  const symbol = Object.keys(currencySymbolMap).find((k) => text.includes(k));
  return symbol ? currencySymbolMap[symbol] : "USD";
}

function parseDate(text: string): number {
  const patterns = [
    /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/,
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

function parseAmount(line: string): number | null {
  const match = line.match(/(-?\d+(?:[\.,]\d{2})?)/g);
  if (!match?.length) return null;
  const value = Number(match[match.length - 1].replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

function extractItems(lines: string[]) {
  const items: ParsedReceipt["items"] = [];

  for (const line of lines) {
    const clean = line.trim();
    if (!clean) continue;
    if (/subtotal|tax|total|change|cash|visa|master/i.test(clean)) continue;

    const match = clean.match(lineItemPattern);
    if (!match?.groups) continue;

    const rawName = match.groups.name.trim();
    const price = Number(match.groups.price.replace(/[^\d.]/g, ""));
    if (!rawName || !Number.isFinite(price)) continue;

    const qtyMatch = rawName.match(qtyPattern);
    const quantity = qtyMatch?.groups?.qty
      ? Number(qtyMatch.groups.qty)
      : 1;
    const unit: Unit = /kg|g|lb|oz|l|ml/i.test(rawName) ? "g" : "pcs";
    const unitPrice = quantity > 0 ? price / quantity : price;

    items.push({
      rawName: rawName.replace(qtyPattern, "").trim(),
      quantity,
      unit,
      unitPrice,
      totalPrice: price,
      confidence: 0.82,
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

    if (/subtotal/i.test(line)) subtotal = amount;
    if (/tax/i.test(line)) tax = amount;
    if (/total/i.test(line)) total = Math.max(total, amount);
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
