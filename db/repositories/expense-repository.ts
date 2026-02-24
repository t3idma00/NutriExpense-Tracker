import { getDb } from "@/db/database";
import type { ExpenseCategory, ExpenseItem, ParsedReceipt, Receipt } from "@/types";
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

function mapExpenseRow(row: Record<string, unknown>): ExpenseRow {
  return {
    id: String(row.id),
    receiptId: String(row.receipt_id),
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
  async createReceiptWithItems(input: {
    parsed: ParsedReceipt;
    imageUri: string;
    storeAddress?: string;
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

    const items: ExpenseItem[] = input.parsed.items.map((item) => ({
      id: createId(),
      receiptId: receipt.id,
      name: item.rawName,
      category: "grocery",
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      currency: input.parsed.currency,
      purchaseDate: input.parsed.date,
      tags: [],
      createdAt: now,
    }));

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
            id, receipt_id, name, name_translated, category, subcategory, quantity, unit, unit_price,
            total_price, currency, purchase_date, expiry_date, brand, barcode, tags, notes, version, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.id,
            item.receiptId,
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
    return (result.changes ?? 0) > 0;
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
