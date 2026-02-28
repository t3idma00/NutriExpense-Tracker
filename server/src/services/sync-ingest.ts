import type { PoolClient } from "pg";

/* ------------------------------------------------------------------ */
/*  Type helpers                                                       */
/* ------------------------------------------------------------------ */

type Row = Record<string, unknown>;

/** Convert SQLite INTEGER (0/1) to PostgreSQL BOOLEAN */
function toBool(val: unknown): boolean {
  return val === 1 || val === true || val === "1";
}

/** Convert SQLite TEXT JSON string to a valid JSON string for JSONB columns.
 *  pg driver needs a JSON string (not a JS object) for JSONB inserts. */
function toJsonb(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "string") {
    // Validate it's valid JSON, return as-is if so
    try {
      JSON.parse(val);
      return val;
    } catch {
      // Not valid JSON — wrap as a JSON string
      return JSON.stringify(val);
    }
  }
  if (typeof val === "object") {
    return JSON.stringify(val);
  }
  return JSON.stringify(val);
}

/* ------------------------------------------------------------------ */
/*  Per-table upsert functions                                         */
/* ------------------------------------------------------------------ */

async function upsertUsers(client: PoolClient, rows: Row[]): Promise<number> {
  let count = 0;
  for (const r of rows) {
    await client.query(
      `INSERT INTO users (id, name, email, avatar_uri, weight_kg, height_cm, age,
         gender, activity_level, health_goals, dietary_restrictions,
         preferred_language, onboarding_completed, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         email = EXCLUDED.email,
         weight_kg = EXCLUDED.weight_kg,
         height_cm = EXCLUDED.height_cm,
         age = EXCLUDED.age,
         gender = EXCLUDED.gender,
         activity_level = EXCLUDED.activity_level,
         health_goals = EXCLUDED.health_goals,
         dietary_restrictions = EXCLUDED.dietary_restrictions,
         preferred_language = EXCLUDED.preferred_language,
         onboarding_completed = EXCLUDED.onboarding_completed,
         updated_at = EXCLUDED.updated_at`,
      [
        r.id, r.name, r.email ?? null, r.avatar_uri ?? null,
        r.weight_kg ?? null, r.height_cm ?? null, r.age ?? null,
        r.gender ?? null, r.activity_level ?? null,
        toJsonb(r.health_goals), toJsonb(r.dietary_restrictions),
        r.preferred_language ?? "en", toBool(r.onboarding_completed),
        r.created_at, r.updated_at,
      ],
    );
    count++;
  }
  return count;
}

async function upsertCategories(client: PoolClient, rows: Row[]): Promise<number> {
  let count = 0;
  for (const r of rows) {
    await client.query(
      `INSERT INTO categories (id, name, icon, color, parent_id, user_id)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name, icon = EXCLUDED.icon,
         color = EXCLUDED.color, parent_id = EXCLUDED.parent_id`,
      [r.id, r.name, r.icon ?? null, r.color ?? null, r.parent_id ?? null, r.user_id ?? null],
    );
    count++;
  }
  return count;
}

async function upsertHouseholdProfiles(client: PoolClient, rows: Row[]): Promise<number> {
  let count = 0;
  for (const r of rows) {
    await client.query(
      `INSERT INTO household_profiles (id, user_id, name, meals_per_day, grocery_frequency, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name, meals_per_day = EXCLUDED.meals_per_day,
         grocery_frequency = EXCLUDED.grocery_frequency, updated_at = EXCLUDED.updated_at`,
      [r.id, r.user_id, r.name ?? "My Household", r.meals_per_day ?? 3, r.grocery_frequency ?? "weekly", r.created_at, r.updated_at],
    );
    count++;
  }
  return count;
}

async function upsertFamilyMembers(client: PoolClient, rows: Row[]): Promise<number> {
  let count = 0;
  for (const r of rows) {
    await client.query(
      `INSERT INTO family_members (id, household_id, name, role, age, gender, weight_kg, height_cm,
         is_school_age, is_active, rda_profile_key, rda_targets, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name, role = EXCLUDED.role, age = EXCLUDED.age,
         weight_kg = EXCLUDED.weight_kg, height_cm = EXCLUDED.height_cm,
         is_school_age = EXCLUDED.is_school_age, is_active = EXCLUDED.is_active,
         rda_targets = EXCLUDED.rda_targets, updated_at = EXCLUDED.updated_at`,
      [
        r.id, r.household_id, r.name, r.role ?? null, r.age ?? null, r.gender ?? null,
        r.weight_kg ?? null, r.height_cm ?? null, toBool(r.is_school_age), toBool(r.is_active),
        r.rda_profile_key ?? null, toJsonb(r.rda_targets), r.created_at, r.updated_at,
      ],
    );
    count++;
  }
  return count;
}

async function upsertReceipts(client: PoolClient, rows: Row[]): Promise<number> {
  let count = 0;
  for (const r of rows) {
    await client.query(
      `INSERT INTO receipts (id, image_uri, raw_ocr_text, store_name, store_address,
         currency, total_amount, detected_language, scan_date, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (id) DO UPDATE SET
         store_name = EXCLUDED.store_name, store_address = EXCLUDED.store_address,
         total_amount = EXCLUDED.total_amount`,
      [
        r.id, r.image_uri, r.raw_ocr_text, r.store_name ?? null, r.store_address ?? null,
        r.currency ?? "USD", r.total_amount ?? null, r.detected_language ?? null,
        r.scan_date, r.created_at,
      ],
    );
    count++;
  }
  return count;
}

async function upsertProductCatalog(client: PoolClient, rows: Row[]): Promise<number> {
  let count = 0;
  for (const r of rows) {
    await client.query(
      `INSERT INTO product_catalog (id, normalized_name, display_name, display_name_translated,
         category, subcategory, brand, barcode, is_food, nutrition_json, nutrition_source,
         nutrition_confidence, nutrition_updated_at, tags, first_seen_at, last_seen_at,
         purchase_count, avg_price, min_price, max_price, last_price, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
       ON CONFLICT (id) DO UPDATE SET
         display_name = EXCLUDED.display_name, category = EXCLUDED.category,
         is_food = EXCLUDED.is_food, nutrition_json = EXCLUDED.nutrition_json,
         nutrition_source = EXCLUDED.nutrition_source, nutrition_confidence = EXCLUDED.nutrition_confidence,
         nutrition_updated_at = EXCLUDED.nutrition_updated_at, last_seen_at = EXCLUDED.last_seen_at,
         purchase_count = EXCLUDED.purchase_count, avg_price = EXCLUDED.avg_price,
         min_price = EXCLUDED.min_price, max_price = EXCLUDED.max_price,
         last_price = EXCLUDED.last_price, updated_at = EXCLUDED.updated_at`,
      [
        r.id, r.normalized_name, r.display_name, r.display_name_translated ?? null,
        r.category ?? "grocery", r.subcategory ?? null, r.brand ?? null, r.barcode ?? null,
        toBool(r.is_food), toJsonb(r.nutrition_json), r.nutrition_source ?? null,
        r.nutrition_confidence ?? null, r.nutrition_updated_at ?? null,
        toJsonb(r.tags), r.first_seen_at, r.last_seen_at,
        r.purchase_count ?? 1, r.avg_price ?? null, r.min_price ?? null,
        r.max_price ?? null, r.last_price ?? null, r.created_at, r.updated_at,
      ],
    );
    count++;
  }
  return count;
}

async function upsertExpenseItems(client: PoolClient, rows: Row[]): Promise<number> {
  let count = 0;
  for (const r of rows) {
    await client.query(
      `INSERT INTO expense_items (id, receipt_id, catalog_id, name, name_translated,
         category, subcategory, quantity, unit, unit_price, total_price, currency,
         purchase_date, expiry_date, brand, barcode, tags, notes, version, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name, category = EXCLUDED.category,
         quantity = EXCLUDED.quantity, total_price = EXCLUDED.total_price,
         tags = EXCLUDED.tags, notes = EXCLUDED.notes, version = EXCLUDED.version`,
      [
        r.id, r.receipt_id, r.catalog_id ?? null, r.name, r.name_translated ?? null,
        r.category ?? "other", r.subcategory ?? null, r.quantity ?? 1, r.unit ?? "pcs",
        r.unit_price ?? null, r.total_price, r.currency ?? "USD",
        r.purchase_date, r.expiry_date ?? null, r.brand ?? null, r.barcode ?? null,
        toJsonb(r.tags), r.notes ?? null, r.version ?? 1, r.created_at,
      ],
    );
    count++;
  }
  return count;
}

async function upsertNutritionProfiles(client: PoolClient, rows: Row[]): Promise<number> {
  let count = 0;
  for (const r of rows) {
    await client.query(
      `INSERT INTO nutrition_profiles (id, expense_item_id, source, serving_size_g,
         servings_per_container, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g,
         saturated_fat_g, trans_fat_g, unsaturated_fat_g, sodium_mg, potassium_mg,
         calcium_mg, iron_mg, magnesium_mg, vitamin_a_mcg, vitamin_c_mg, vitamin_d_mcg,
         vitamin_e_mg, vitamin_k_mcg, vitamin_b1_mg, vitamin_b2_mg, vitamin_b3_mg,
         vitamin_b6_mg, vitamin_b12_mcg, folate_mcg, zinc_mg, selenium_mcg,
         cholesterol_mg, ai_confidence_score, raw_label_text, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36)
       ON CONFLICT (id) DO UPDATE SET
         calories = EXCLUDED.calories, protein_g = EXCLUDED.protein_g,
         carbs_g = EXCLUDED.carbs_g, fat_g = EXCLUDED.fat_g,
         ai_confidence_score = EXCLUDED.ai_confidence_score`,
      [
        r.id, r.expense_item_id, r.source,
        r.serving_size_g ?? null, r.servings_per_container ?? null,
        r.calories ?? null, r.protein_g ?? null, r.carbs_g ?? null,
        r.fat_g ?? null, r.fiber_g ?? null, r.sugar_g ?? null,
        r.saturated_fat_g ?? null, r.trans_fat_g ?? null, r.unsaturated_fat_g ?? null,
        r.sodium_mg ?? null, r.potassium_mg ?? null, r.calcium_mg ?? null,
        r.iron_mg ?? null, r.magnesium_mg ?? null, r.vitamin_a_mcg ?? null,
        r.vitamin_c_mg ?? null, r.vitamin_d_mcg ?? null, r.vitamin_e_mg ?? null,
        r.vitamin_k_mcg ?? null, r.vitamin_b1_mg ?? null, r.vitamin_b2_mg ?? null,
        r.vitamin_b3_mg ?? null, r.vitamin_b6_mg ?? null, r.vitamin_b12_mcg ?? null,
        r.folate_mcg ?? null, r.zinc_mg ?? null, r.selenium_mcg ?? null,
        r.cholesterol_mg ?? null, r.ai_confidence_score ?? null,
        r.raw_label_text ?? null, r.created_at,
      ],
    );
    count++;
  }
  return count;
}

async function upsertDailyNutritionLogs(client: PoolClient, rows: Row[]): Promise<number> {
  let count = 0;
  for (const r of rows) {
    await client.query(
      `INSERT INTO daily_nutrition_logs (id, user_id, log_date, expense_item_id,
         consumed_servings, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g,
         sodium_mg, confidence_score, source, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       ON CONFLICT (id) DO UPDATE SET
         consumed_servings = EXCLUDED.consumed_servings, calories = EXCLUDED.calories`,
      [
        r.id, r.user_id, r.log_date, r.expense_item_id,
        r.consumed_servings ?? 1, r.calories ?? null, r.protein_g ?? null,
        r.carbs_g ?? null, r.fat_g ?? null, r.fiber_g ?? null,
        r.sugar_g ?? null, r.sodium_mg ?? null, r.confidence_score ?? null,
        r.source ?? null, r.created_at,
      ],
    );
    count++;
  }
  return count;
}

async function upsertHealthAlerts(client: PoolClient, rows: Row[]): Promise<number> {
  let count = 0;
  for (const r of rows) {
    await client.query(
      `INSERT INTO health_alerts (id, user_id, alert_type, nutrient_key, current_value,
         target_value, severity, message, message_translated, is_read, triggered_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (id) DO UPDATE SET
         is_read = EXCLUDED.is_read, message = EXCLUDED.message`,
      [
        r.id, r.user_id, r.alert_type, r.nutrient_key ?? null,
        r.current_value ?? null, r.target_value ?? null, r.severity,
        r.message, r.message_translated ?? null, toBool(r.is_read), r.triggered_at,
      ],
    );
    count++;
  }
  return count;
}

async function upsertItemCategoryMemory(client: PoolClient, rows: Row[]): Promise<number> {
  let count = 0;
  for (const r of rows) {
    await client.query(
      `INSERT INTO item_category_memory (normalized_name, category, subcategory,
         confidence, use_count, last_seen_at)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (normalized_name) DO UPDATE SET
         category = EXCLUDED.category, confidence = EXCLUDED.confidence,
         use_count = EXCLUDED.use_count, last_seen_at = EXCLUDED.last_seen_at`,
      [r.normalized_name, r.category, r.subcategory ?? null, r.confidence ?? 1, r.use_count ?? 1, r.last_seen_at],
    );
    count++;
  }
  return count;
}

async function upsertReceiptCorrections(client: PoolClient, rows: Row[]): Promise<number> {
  let count = 0;
  for (const r of rows) {
    await client.query(
      `INSERT INTO receipt_corrections (id, item_name_original, item_name_corrected, confidence_before, created_at)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (id) DO NOTHING`,
      [r.id, r.item_name_original, r.item_name_corrected, r.confidence_before ?? null, r.created_at],
    );
    count++;
  }
  return count;
}

async function upsertBarcodeNutritionCache(client: PoolClient, rows: Row[]): Promise<number> {
  let count = 0;
  for (const r of rows) {
    await client.query(
      `INSERT INTO barcode_nutrition_cache (barcode, payload_json, updated_at)
       VALUES ($1,$2,$3)
       ON CONFLICT (barcode) DO UPDATE SET
         payload_json = EXCLUDED.payload_json, updated_at = EXCLUDED.updated_at`,
      [r.barcode, toJsonb(r.payload_json), r.updated_at],
    );
    count++;
  }
  return count;
}

async function upsertNutritionNameCache(client: PoolClient, rows: Row[]): Promise<number> {
  let count = 0;
  for (const r of rows) {
    await client.query(
      `INSERT INTO nutrition_name_cache (normalized_name, payload_json, source, confidence, hit_count, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (normalized_name) DO UPDATE SET
         payload_json = EXCLUDED.payload_json, confidence = EXCLUDED.confidence,
         hit_count = EXCLUDED.hit_count, updated_at = EXCLUDED.updated_at`,
      [r.normalized_name, toJsonb(r.payload_json), r.source ?? "ai_inferred", r.confidence ?? 0.7, r.hit_count ?? 1, r.updated_at],
    );
    count++;
  }
  return count;
}

async function upsertNutritionAnalyticsSnapshots(client: PoolClient, rows: Row[]): Promise<number> {
  let count = 0;
  for (const r of rows) {
    await client.query(
      `INSERT INTO nutrition_analytics_snapshots (id, user_id, from_ts, to_ts,
         reliability_score, coverage_score, anomaly_count, metrics_json, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO UPDATE SET
         metrics_json = EXCLUDED.metrics_json`,
      [
        r.id, r.user_id, r.from_ts, r.to_ts,
        r.reliability_score, r.coverage_score, r.anomaly_count ?? 0,
        toJsonb(r.metrics_json), r.created_at,
      ],
    );
    count++;
  }
  return count;
}

async function upsertConsumptionModels(client: PoolClient, rows: Row[]): Promise<number> {
  let count = 0;
  for (const r of rows) {
    await client.query(
      `INSERT INTO consumption_models (id, user_id, expense_item_id, avg_daily_servings,
         trend_slope, variability, confidence, last_predicted_depletion, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO UPDATE SET
         avg_daily_servings = EXCLUDED.avg_daily_servings,
         trend_slope = EXCLUDED.trend_slope, variability = EXCLUDED.variability,
         confidence = EXCLUDED.confidence,
         last_predicted_depletion = EXCLUDED.last_predicted_depletion,
         updated_at = EXCLUDED.updated_at`,
      [
        r.id, r.user_id, r.expense_item_id, r.avg_daily_servings ?? 0,
        r.trend_slope ?? 0, r.variability ?? 0, r.confidence ?? 0,
        r.last_predicted_depletion ?? null, r.updated_at,
      ],
    );
    count++;
  }
  return count;
}

/* ------------------------------------------------------------------ */
/*  Main ingest — upserts all tables in FK-safe order                  */
/* ------------------------------------------------------------------ */

export interface SyncTables {
  users?: Row[];
  categories?: Row[];
  household_profiles?: Row[];
  family_members?: Row[];
  receipts?: Row[];
  product_catalog?: Row[];
  expense_items?: Row[];
  nutrition_profiles?: Row[];
  daily_nutrition_logs?: Row[];
  health_alerts?: Row[];
  item_category_memory?: Row[];
  receipt_corrections?: Row[];
  barcode_nutrition_cache?: Row[];
  nutrition_name_cache?: Row[];
  nutrition_analytics_snapshots?: Row[];
  consumption_models?: Row[];
}

export interface IngestResult {
  counts: Record<string, number>;
  totalRecords: number;
}

export async function ingestSyncPayload(
  client: PoolClient,
  tables: SyncTables,
): Promise<IngestResult> {
  const counts: Record<string, number> = {};

  // Upsert in FK-safe order (parents before children)
  const steps: Array<[string, Row[] | undefined, (c: PoolClient, r: Row[]) => Promise<number>]> = [
    ["users", tables.users, upsertUsers],
    ["categories", tables.categories, upsertCategories],
    ["household_profiles", tables.household_profiles, upsertHouseholdProfiles],
    ["family_members", tables.family_members, upsertFamilyMembers],
    ["receipts", tables.receipts, upsertReceipts],
    ["product_catalog", tables.product_catalog, upsertProductCatalog],
    ["expense_items", tables.expense_items, upsertExpenseItems],
    ["nutrition_profiles", tables.nutrition_profiles, upsertNutritionProfiles],
    ["daily_nutrition_logs", tables.daily_nutrition_logs, upsertDailyNutritionLogs],
    ["health_alerts", tables.health_alerts, upsertHealthAlerts],
    ["item_category_memory", tables.item_category_memory, upsertItemCategoryMemory],
    ["receipt_corrections", tables.receipt_corrections, upsertReceiptCorrections],
    ["barcode_nutrition_cache", tables.barcode_nutrition_cache, upsertBarcodeNutritionCache],
    ["nutrition_name_cache", tables.nutrition_name_cache, upsertNutritionNameCache],
    ["nutrition_analytics_snapshots", tables.nutrition_analytics_snapshots, upsertNutritionAnalyticsSnapshots],
    ["consumption_models", tables.consumption_models, upsertConsumptionModels],
  ];

  for (const [name, rows, fn] of steps) {
    if (rows && rows.length > 0) {
      counts[name] = await fn(client, rows);
    }
  }

  const totalRecords = Object.values(counts).reduce((sum, n) => sum + n, 0);
  return { counts, totalRecords };
}
