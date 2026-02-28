/**
 * Normalize a product name for matching/deduplication.
 * Strips quantities, units, special characters while preserving Nordic chars.
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\d+\s*(kg|g|ml|l|cl|dl|pcs|kpl|pack)\b/gi, "")
    .replace(/[^a-zäöüåæø\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
