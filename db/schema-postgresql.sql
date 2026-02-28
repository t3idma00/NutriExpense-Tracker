-- ============================================================
-- DailyExpenses — PostgreSQL Schema
-- Converted from SQLite (db/schema.ts)
-- ============================================================

-- Users
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    avatar_uri TEXT,
    weight_kg DOUBLE PRECISION,
    height_cm DOUBLE PRECISION,
    age INTEGER,
    gender TEXT,
    activity_level TEXT,
    health_goals JSONB NOT NULL DEFAULT '[]',
    dietary_restrictions JSONB NOT NULL DEFAULT '[]',
    preferred_language TEXT NOT NULL DEFAULT 'en',
    onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

-- Receipts
CREATE TABLE IF NOT EXISTS receipts (
    id TEXT PRIMARY KEY NOT NULL,
    image_uri TEXT NOT NULL,
    raw_ocr_text TEXT NOT NULL,
    store_name TEXT,
    store_address TEXT,
    currency TEXT NOT NULL DEFAULT 'USD',
    total_amount DOUBLE PRECISION,
    detected_language TEXT,
    scan_date BIGINT NOT NULL,
    created_at BIGINT NOT NULL
);

-- Product Catalog (universal item registry)
CREATE TABLE IF NOT EXISTS product_catalog (
    id TEXT PRIMARY KEY NOT NULL,
    normalized_name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    display_name_translated TEXT,
    category TEXT NOT NULL DEFAULT 'grocery',
    subcategory TEXT,
    brand TEXT,
    barcode TEXT,
    is_food BOOLEAN NOT NULL DEFAULT TRUE,
    nutrition_json JSONB,
    nutrition_source TEXT,
    nutrition_confidence DOUBLE PRECISION,
    nutrition_updated_at BIGINT,
    tags JSONB NOT NULL DEFAULT '[]',
    first_seen_at BIGINT NOT NULL,
    last_seen_at BIGINT NOT NULL,
    purchase_count INTEGER NOT NULL DEFAULT 1,
    avg_price DOUBLE PRECISION,
    min_price DOUBLE PRECISION,
    max_price DOUBLE PRECISION,
    last_price DOUBLE PRECISION,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

-- Expense Items
CREATE TABLE IF NOT EXISTS expense_items (
    id TEXT PRIMARY KEY NOT NULL,
    receipt_id TEXT NOT NULL REFERENCES receipts(id),
    catalog_id TEXT REFERENCES product_catalog(id),
    name TEXT NOT NULL,
    name_translated TEXT,
    category TEXT NOT NULL DEFAULT 'other',
    subcategory TEXT,
    quantity DOUBLE PRECISION NOT NULL DEFAULT 1,
    unit TEXT NOT NULL DEFAULT 'pcs',
    unit_price DOUBLE PRECISION,
    total_price DOUBLE PRECISION NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    purchase_date BIGINT NOT NULL,
    expiry_date BIGINT,
    brand TEXT,
    barcode TEXT,
    tags JSONB NOT NULL DEFAULT '[]',
    notes TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    created_at BIGINT NOT NULL
);

-- Nutrition Profiles
CREATE TABLE IF NOT EXISTS nutrition_profiles (
    id TEXT PRIMARY KEY NOT NULL,
    expense_item_id TEXT NOT NULL REFERENCES expense_items(id),
    source TEXT NOT NULL,
    serving_size_g DOUBLE PRECISION,
    servings_per_container DOUBLE PRECISION,
    calories DOUBLE PRECISION,
    protein_g DOUBLE PRECISION,
    carbs_g DOUBLE PRECISION,
    fat_g DOUBLE PRECISION,
    fiber_g DOUBLE PRECISION,
    sugar_g DOUBLE PRECISION,
    saturated_fat_g DOUBLE PRECISION,
    trans_fat_g DOUBLE PRECISION,
    unsaturated_fat_g DOUBLE PRECISION,
    sodium_mg DOUBLE PRECISION,
    potassium_mg DOUBLE PRECISION,
    calcium_mg DOUBLE PRECISION,
    iron_mg DOUBLE PRECISION,
    magnesium_mg DOUBLE PRECISION,
    vitamin_a_mcg DOUBLE PRECISION,
    vitamin_c_mg DOUBLE PRECISION,
    vitamin_d_mcg DOUBLE PRECISION,
    vitamin_e_mg DOUBLE PRECISION,
    vitamin_k_mcg DOUBLE PRECISION,
    vitamin_b1_mg DOUBLE PRECISION,
    vitamin_b2_mg DOUBLE PRECISION,
    vitamin_b3_mg DOUBLE PRECISION,
    vitamin_b6_mg DOUBLE PRECISION,
    vitamin_b12_mcg DOUBLE PRECISION,
    folate_mcg DOUBLE PRECISION,
    zinc_mg DOUBLE PRECISION,
    selenium_mcg DOUBLE PRECISION,
    cholesterol_mg DOUBLE PRECISION,
    ai_confidence_score DOUBLE PRECISION,
    raw_label_text TEXT,
    created_at BIGINT NOT NULL
);

-- Daily Nutrition Logs
CREATE TABLE IF NOT EXISTS daily_nutrition_logs (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id),
    log_date BIGINT NOT NULL,
    expense_item_id TEXT NOT NULL REFERENCES expense_items(id),
    consumed_servings DOUBLE PRECISION NOT NULL DEFAULT 1,
    calories DOUBLE PRECISION,
    protein_g DOUBLE PRECISION,
    carbs_g DOUBLE PRECISION,
    fat_g DOUBLE PRECISION,
    fiber_g DOUBLE PRECISION,
    sugar_g DOUBLE PRECISION,
    sodium_mg DOUBLE PRECISION,
    confidence_score DOUBLE PRECISION,
    source TEXT,
    created_at BIGINT NOT NULL
);

-- Health Alerts
CREATE TABLE IF NOT EXISTS health_alerts (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id),
    alert_type TEXT NOT NULL,
    nutrient_key TEXT,
    current_value DOUBLE PRECISION,
    target_value DOUBLE PRECISION,
    severity TEXT NOT NULL,
    message TEXT NOT NULL,
    message_translated TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    triggered_at BIGINT NOT NULL
);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    parent_id TEXT,
    user_id TEXT
);

-- Household Profiles
CREATE TABLE IF NOT EXISTS household_profiles (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
    name TEXT NOT NULL DEFAULT 'My Household',
    meals_per_day INTEGER NOT NULL DEFAULT 3,
    grocery_frequency TEXT NOT NULL DEFAULT 'weekly',
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

-- Family Members
CREATE TABLE IF NOT EXISTS family_members (
    id TEXT PRIMARY KEY NOT NULL,
    household_id TEXT NOT NULL REFERENCES household_profiles(id),
    name TEXT NOT NULL,
    role TEXT,
    age INTEGER,
    gender TEXT,
    weight_kg DOUBLE PRECISION,
    height_cm DOUBLE PRECISION,
    is_school_age BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    rda_profile_key TEXT,
    rda_targets JSONB NOT NULL DEFAULT '{}',
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

-- Item Category Memory
CREATE TABLE IF NOT EXISTS item_category_memory (
    normalized_name TEXT PRIMARY KEY NOT NULL,
    category TEXT NOT NULL,
    subcategory TEXT,
    confidence DOUBLE PRECISION NOT NULL DEFAULT 1,
    use_count INTEGER NOT NULL DEFAULT 1,
    last_seen_at BIGINT NOT NULL
);

-- Receipt Corrections
CREATE TABLE IF NOT EXISTS receipt_corrections (
    id TEXT PRIMARY KEY NOT NULL,
    item_name_original TEXT NOT NULL,
    item_name_corrected TEXT NOT NULL,
    confidence_before DOUBLE PRECISION,
    created_at BIGINT NOT NULL
);

-- Barcode Nutrition Cache
CREATE TABLE IF NOT EXISTS barcode_nutrition_cache (
    barcode TEXT PRIMARY KEY NOT NULL,
    payload_json JSONB NOT NULL,
    updated_at BIGINT NOT NULL
);

-- Nutrition Analytics Snapshots
CREATE TABLE IF NOT EXISTS nutrition_analytics_snapshots (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id),
    from_ts BIGINT NOT NULL,
    to_ts BIGINT NOT NULL,
    reliability_score DOUBLE PRECISION NOT NULL,
    coverage_score DOUBLE PRECISION NOT NULL,
    anomaly_count INTEGER NOT NULL DEFAULT 0,
    metrics_json JSONB NOT NULL,
    created_at BIGINT NOT NULL
);

-- Consumption Models
CREATE TABLE IF NOT EXISTS consumption_models (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id),
    expense_item_id TEXT NOT NULL REFERENCES expense_items(id),
    avg_daily_servings DOUBLE PRECISION NOT NULL DEFAULT 0,
    trend_slope DOUBLE PRECISION NOT NULL DEFAULT 0,
    variability DOUBLE PRECISION NOT NULL DEFAULT 0,
    confidence DOUBLE PRECISION NOT NULL DEFAULT 0,
    last_predicted_depletion BIGINT,
    updated_at BIGINT NOT NULL,
    UNIQUE(user_id, expense_item_id)
);

-- Nutrition Name Cache
CREATE TABLE IF NOT EXISTS nutrition_name_cache (
    normalized_name TEXT PRIMARY KEY NOT NULL,
    payload_json JSONB NOT NULL,
    source TEXT NOT NULL DEFAULT 'ai_inferred',
    confidence DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    hit_count INTEGER NOT NULL DEFAULT 1,
    updated_at BIGINT NOT NULL
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_expense_items_purchase_category ON expense_items (purchase_date, category);
CREATE INDEX IF NOT EXISTS idx_expense_items_catalog ON expense_items (catalog_id) WHERE catalog_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_daily_logs_date_user ON daily_nutrition_logs (log_date, user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_user_read ON health_alerts (user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_family_members_household ON family_members (household_id);
CREATE INDEX IF NOT EXISTS idx_analytics_user_to ON nutrition_analytics_snapshots (user_id, to_ts DESC);
CREATE INDEX IF NOT EXISTS idx_consumption_models_user ON consumption_models (user_id, confidence DESC);
CREATE INDEX IF NOT EXISTS idx_product_catalog_normalized ON product_catalog (normalized_name);
CREATE INDEX IF NOT EXISTS idx_product_catalog_category ON product_catalog (category);
CREATE INDEX IF NOT EXISTS idx_product_catalog_barcode ON product_catalog (barcode) WHERE barcode IS NOT NULL;

-- ============================================================
-- Full-Text Search (PostgreSQL equivalent using tsvector)
-- ============================================================

-- Add a tsvector column for full-text search on expense items
ALTER TABLE expense_items ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (to_tsvector('simple', coalesce(name, ''))) STORED;

CREATE INDEX IF NOT EXISTS idx_expense_items_fts ON expense_items USING GIN (search_vector);

-- ============================================================
-- Notes on SQLite → PostgreSQL differences:
-- ============================================================
-- 1. REAL → DOUBLE PRECISION (more precise)
-- 2. INTEGER booleans (0/1) → BOOLEAN (TRUE/FALSE)
-- 3. TEXT for JSON → JSONB (queryable, indexable)
-- 4. INTEGER timestamps → BIGINT (milliseconds since epoch)
-- 5. SQLite FTS5 → PostgreSQL tsvector + GIN index
-- 6. PRAGMA journal_mode = WAL → not needed (PG uses WAL by default)
-- 7. FOREIGN KEY syntax inline instead of separate clause
-- 8. catalog_id column included directly in expense_items table
