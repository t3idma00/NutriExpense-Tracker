import { getDb } from "@/db/database";
import type { ExpenseCategory, ExpenseItem, ParsedReceipt, Receipt } from "@/types";
import type { GeminiItemNutrition } from "@/services/receipt-ocr.service";
import { createId } from "@/utils/id";

export interface ExpenseFilters {
  category?: ExpenseCategory;
  from?: number;
  to?: number;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  cursorDate?: number;
  limit?: number;
}

export interface ExpenseRow extends ExpenseItem {
  storeName?: string;
  receiptDate: number;
  version: number;
}

const categoryKeywordMap: Array<{ category: ExpenseCategory; keywords: string[] }> = [
  { category: "produce", keywords: ["apple", "banana", "avocado", "spinach", "tomato", "onion", "lettuce"] },
  { category: "bakery", keywords: ["bread", "bun", "cake", "cookie", "croissant", "muffin"] },
  { category: "pharmacy", keywords: ["vitamin", "tablet", "capsule", "medicine", "bandage", "syrup"] },
  { category: "household", keywords: ["detergent", "soap", "cleaner", "tissue", "trash", "foil"] },
  { category: "restaurant", keywords: ["burger", "pizza", "meal", "combo", "fries", "delivery"] },
  { category: "personal_care", keywords: ["shampoo", "conditioner", "toothpaste", "lotion", "deodorant"] },
  { category: "electronics", keywords: ["charger", "battery", "adapter", "cable", "headphones"] },
  { category: "clothing", keywords: ["shirt", "pants", "jacket", "sock", "shoe"] },
];

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function inferCategoryByKeywords(name: string): ExpenseCategory {
  const normalized = normalizeName(name);
  for (const mapping of categoryKeywordMap) {
    if (mapping.keywords.some((token) => normalized.includes(token))) {
      return mapping.category;
    }
  }
  return "grocery";
}

function mapExpenseRow(row: Record<string, unknown>): ExpenseRow {
  return {
    id: String(row.id),
    receiptId: String(row.receipt_id),
    catalogId: row.catalog_id ? String(row.catalog_id) : undefined,
    name: String(row.name),
    nameTranslated: row.name_translated ? String(row.name_translated) : undefined,
    category: String(row.category) as ExpenseCategory,
    subcategory: row.subcategory ? String(row.subcategory) : undefined,
    quantity: Number(row.quantity ?? 1),
    unit: String(row.unit) as ExpenseItem["unit"],
    unitPrice: row.unit_price !== null ? Number(row.unit_price) : undefined,
    totalPrice: Number(row.total_price ?? 0),
    currency: String(row.currency ?? "USD"),
    purchaseDate: Number(row.purchase_date ?? Date.now()),
    expiryDate: row.expiry_date ? Number(row.expiry_date) : undefined,
    brand: row.brand ? String(row.brand) : undefined,
    barcode: row.barcode ? String(row.barcode) : undefined,
    tags: JSON.parse(String(row.tags ?? "[]")),
    notes: row.notes ? String(row.notes) : undefined,
    createdAt: Number(row.created_at ?? Date.now()),
    storeName: row.store_name ? String(row.store_name) : undefined,
    receiptDate: Number(row.scan_date ?? row.purchase_date ?? Date.now()),
    version: Number(row.version ?? 1),
  };
}

export class ExpenseRepository {
  private async resolveCategoryFromMemory(name: string): Promise<ExpenseCategory> {
    const db = await getDb();
    const normalized = normalizeName(name);
    const row = await db.getFirstAsync<Record<string, unknown>>(
      "SELECT category FROM item_category_memory WHERE normalized_name = ? LIMIT 1",
      [normalized],
    );
    return row?.category ? (String(row.category) as ExpenseCategory) : inferCategoryByKeywords(name);
  }

  private async rememberCategory(name: string, category: ExpenseCategory): Promise<void> {
    const db = await getDb();
    const normalized = normalizeName(name);
    await db.runAsync(
      `INSERT INTO item_category_memory (normalized_name, category, confidence, use_count, last_seen_at)
       VALUES (?, ?, ?, 1, ?)
       ON CONFLICT(normalized_name)
       DO UPDATE SET
         category = excluded.category,
         confidence = MIN(1, item_category_memory.confidence + 0.05),
         use_count = item_category_memory.use_count + 1,
         last_seen_at = excluded.last_seen_at`,
      [normalized, category, 0.75, Date.now()],
    );
  }

  async createReceiptWithItems(input: {
    parsed: ParsedReceipt;
    imageUri: string;
    storeAddress?: string;
    geminiItems?: Array<{ name: string; nutrition?: GeminiItemNutrition; matchedCatalogName?: string }>;
  }): Promise<{ receipt: Receipt; items: ExpenseItem[] }> {
    const db = await getDb();
    const now = Date.now();
    const receipt: Receipt = {
      id: createId(),
      imageUri: input.imageUri,
      rawOcrText: input.parsed.rawText,
      storeName: input.parsed.storeName,
      storeAddress: input.storeAddress,
      currency: input.parsed.currency,
      totalAmount: input.parsed.total,
      detectedLanguage: input.parsed.detectedLanguage,
      scanDate: input.parsed.date,
      createdAt: now,
    };

    // Build Gemini lookup by normalized name (nutrition + catalog match)
    const geminiLookup = new Map<string, { nutrition?: GeminiItemNutrition; matchedCatalogName?: string }>();
    if (input.geminiItems) {
      const { normalizeName } = await import("@/utils/normalize-name");
      for (const gi of input.geminiItems) {
        if (gi.name) {
          geminiLookup.set(normalizeName(gi.name), {
            nutrition: gi.nutrition,
            matchedCatalogName: gi.matchedCatalogName,
          });
        }
      }
    }

    // Resolve catalog entries and build items
    const items: ExpenseItem[] = [];
    for (const parsedItem of input.parsed.items) {
      const { normalizeName } = await import("@/utils/normalize-name");
      const normalized = normalizeName(parsedItem.rawName);

      // Find matching Gemini data for this item
      const geminiData = geminiLookup.get(normalized);
      const nutrition = geminiData?.nutrition;

      // Resolve category from memory first
      const category = await this.resolveCategoryFromMemory(parsedItem.rawName);

      // Find or create in product catalog
      // Use AI-matched catalog name for better deduplication when available
      let catalogId: string | undefined;
      try {
        const { CatalogRepository } = await import("@/db/repositories/catalog-repository");
        const catalogRepo = new CatalogRepository();

        // If Gemini matched this to a known product, use that name for catalog lookup
        // This ensures "KEVYTMAITO 1L" matches existing "KEVYTMAITO" entry
        const catalogName = geminiData?.matchedCatalogName ?? parsedItem.rawName;
        if (geminiData?.matchedCatalogName) {
          console.log(`[expense] AI-matched "${parsedItem.rawName}" → "${geminiData.matchedCatalogName}"`);
        }

        const catalogEntry = await catalogRepo.findOrCreate({
          rawName: catalogName,
          category,
          totalPrice: parsedItem.totalPrice,
          nutrition,
        });
        catalogId = catalogEntry.id;
      } catch (err) {
        console.warn("[expense] Catalog findOrCreate failed:", err);
      }

      items.push({
        id: createId(),
        receiptId: receipt.id,
        catalogId,
        name: parsedItem.rawName,
        category,
        quantity: parsedItem.quantity,
        unit: parsedItem.unit,
        unitPrice: parsedItem.unitPrice,
        totalPrice: parsedItem.totalPrice,
        currency: input.parsed.currency,
        purchaseDate: input.parsed.date,
        tags: [],
        createdAt: now,
      });
    }

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO receipts (
          id, image_uri, raw_ocr_text, store_name, store_address, currency, total_amount,
          detected_language, scan_date, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          receipt.id,
          receipt.imageUri,
          receipt.rawOcrText,
          receipt.storeName ?? null,
          receipt.storeAddress ?? null,
          receipt.currency,
          receipt.totalAmount ?? null,
          receipt.detectedLanguage ?? null,
          receipt.scanDate,
          receipt.createdAt,
        ],
      );

      for (const item of items) {
        await db.runAsync(
          `INSERT INTO expense_items (
            id, receipt_id, catalog_id, name, name_translated, category, subcategory, quantity, unit, unit_price,
            total_price, currency, purchase_date, expiry_date, brand, barcode, tags, notes, version, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.id,
            item.receiptId,
            item.catalogId ?? null,
            item.name,
            item.nameTranslated ?? null,
            item.category,
            item.subcategory ?? null,
            item.quantity,
            item.unit,
            item.unitPrice ?? null,
            item.totalPrice,
            item.currency,
            item.purchaseDate,
            item.expiryDate ?? null,
            item.brand ?? null,
            item.barcode ?? null,
            JSON.stringify(item.tags),
            item.notes ?? null,
            1,
            item.createdAt,
          ],
        );

        await this.rememberCategory(item.name, item.category);
      }
    });

    return { receipt, items };
  }

  async listItems(filters: ExpenseFilters = {}): Promise<ExpenseRow[]> {
    const db = await getDb();
    const where: string[] = [];
    const args: Array<string | number> = [];

    if (filters.category) {
      where.push("e.category = ?");
      args.push(filters.category);
    }
    if (typeof filters.from === "number") {
      where.push("e.purchase_date >= ?");
      args.push(filters.from);
    }
    if (typeof filters.to === "number") {
      where.push("e.purchase_date <= ?");
      args.push(filters.to);
    }
    if (typeof filters.minPrice === "number") {
      where.push("e.total_price >= ?");
      args.push(filters.minPrice);
    }
    if (typeof filters.maxPrice === "number") {
      where.push("e.total_price <= ?");
      args.push(filters.maxPrice);
    }
    if (typeof filters.cursorDate === "number") {
      where.push("e.purchase_date < ?");
      args.push(filters.cursorDate);
    }
    if (filters.search?.trim()) {
      where.push("e.id IN (SELECT id FROM expense_items_fts WHERE expense_items_fts MATCH ?)");
      args.push(`${filters.search.trim()}*`);
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const limit = filters.limit ?? 50;
    args.push(limit);

    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT e.*, r.store_name, r.scan_date
       FROM expense_items e
       JOIN receipts r ON r.id = e.receipt_id
       ${whereClause}
       ORDER BY e.purchase_date DESC, e.created_at DESC
       LIMIT ?`,
      args,
    );

    return rows.map(mapExpenseRow);
  }

  async searchItems(query: string): Promise<ExpenseRow[]> {
    return this.listItems({ search: query, limit: 30 });
  }

  async getItemById(id: string): Promise<ExpenseRow | null> {
    const db = await getDb();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      `SELECT e.*, r.store_name, r.scan_date
       FROM expense_items e
       JOIN receipts r ON r.id = e.receipt_id
       WHERE e.id = ?
       LIMIT 1`,
      [id],
    );
    return row ? mapExpenseRow(row) : null;
  }

  async updateItem(
    id: string,
    currentVersion: number,
    patch: Partial<ExpenseItem>,
  ): Promise<boolean> {
    const db = await getDb();
    const current = await this.getItemById(id);
    if (!current) return false;

    const result = await db.runAsync(
      `UPDATE expense_items
       SET
         name = COALESCE(?, name),
         category = COALESCE(?, category),
         quantity = COALESCE(?, quantity),
         unit = COALESCE(?, unit),
         total_price = COALESCE(?, total_price),
         expiry_date = COALESCE(?, expiry_date),
         notes = COALESCE(?, notes),
         tags = COALESCE(?, tags),
         version = version + 1
       WHERE id = ? AND version = ?`,
      [
        patch.name ?? null,
        patch.category ?? null,
        patch.quantity ?? null,
        patch.unit ?? null,
        patch.totalPrice ?? null,
        patch.expiryDate ?? null,
        patch.notes ?? null,
        patch.tags ? JSON.stringify(patch.tags) : null,
        id,
        currentVersion,
      ],
    );

    const changed = (result.changes ?? 0) > 0;
    if (!changed) return false;

    if (patch.category) {
      await this.rememberCategory(patch.name ?? current.name, patch.category);
    }

    return true;
  }

  async deleteItem(id: string): Promise<void> {
    const db = await getDb();
    await db.runAsync("DELETE FROM expense_items WHERE id = ?", [id]);
  }

  async monthlySpendByCategory(
    from: number,
    to: number,
  ): Promise<Array<{ category: string; total: number }>> {
    const db = await getDb();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT category, SUM(total_price) AS total
       FROM expense_items
       WHERE purchase_date BETWEEN ? AND ?
       GROUP BY category
       ORDER BY total DESC`,
      [from, to],
    );
    return rows.map((row) => ({
      category: String(row.category),
      total: Number(row.total ?? 0),
    }));
  }

  async summary(from: number, to: number): Promise<{
    totalSpent: number;
    avgDaily: number;
    itemsCount: number;
    biggestCategory?: string;
  }> {
    const db = await getDb();
    const totals = await db.getFirstAsync<Record<string, unknown>>(
      `SELECT
        SUM(total_price) AS total_spent,
        COUNT(*) AS items_count,
        COUNT(DISTINCT date(purchase_date / 1000, 'unixepoch')) AS days_count
      FROM expense_items
      WHERE purchase_date BETWEEN ? AND ?`,
      [from, to],
    );
    const category = await db.getFirstAsync<Record<string, unknown>>(
      `SELECT category
       FROM expense_items
       WHERE purchase_date BETWEEN ? AND ?
       GROUP BY category
       ORDER BY SUM(total_price) DESC
       LIMIT 1`,
      [from, to],
    );

    const totalSpent = Number(totals?.total_spent ?? 0);
    const daysCount = Math.max(1, Number(totals?.days_count ?? 1));

    return {
      totalSpent,
      avgDaily: totalSpent / daysCount,
      itemsCount: Number(totals?.items_count ?? 0),
      biggestCategory: category?.category ? String(category.category) : undefined,
    };
  }
}
