export type Gender = "male" | "female" | "other";
export type FamilyRole =
  | "mother"
  | "father"
  | "child"
  | "grandparent"
  | "guardian"
  | "other";
export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";
export type HealthGoal =
  | "weight_loss"
  | "muscle_gain"
  | "maintenance"
  | "improve_energy"
  | "better_nutrition";
export type ExpenseCategory =
  | "grocery"
  | "household"
  | "pharmacy"
  | "restaurant"
  | "personal_care"
  | "electronics"
  | "clothing"
  | "produce"
  | "bakery"
  | "other";
export type Unit = "kg" | "g" | "lb" | "oz" | "L" | "ml" | "pcs" | "pack";
export type NutritionSource =
  | "label_scan"
  | "ai_inferred"
  | "barcode_api"
  | "manual";
export type AlertType =
  | "deficiency"
  | "excess"
  | "goal_reached"
  | "expiry_warning"
  | "spending_alert";
export type AlertSeverity = "low" | "medium" | "high" | "critical";
export type NutrientMetricKey =
  | "calories"
  | "proteinG"
  | "carbsG"
  | "fatG"
  | "fiberG"
  | "sugarG"
  | "sodiumMg";

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  avatarUri?: string;
  weightKg?: number;
  heightCm?: number;
  age?: number;
  gender?: Gender;
  activityLevel?: ActivityLevel;
  healthGoals: HealthGoal[];
  dietaryRestrictions: string[];
  preferredLanguage: string;
  onboardingCompleted: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface HouseholdProfile {
  id: string;
  userId: string;
  name: string;
  mealsPerDay: number;
  groceryFrequency: "daily" | "weekly" | "biweekly" | "monthly";
  createdAt: number;
  updatedAt: number;
}

export interface FamilyMember {
  id: string;
  householdId: string;
  name: string;
  role?: FamilyRole;
  age?: number;
  gender?: Gender;
  weightKg?: number;
  heightCm?: number;
  isSchoolAge: boolean;
  isActive: boolean;
  rdaProfileKey?: string;
  rdaTargets: Partial<NutritionAggregate>;
  createdAt: number;
  updatedAt: number;
}

export interface ItemCategoryMemory {
  normalizedName: string;
  category: ExpenseCategory;
  subcategory?: string;
  confidence: number;
  useCount: number;
  lastSeenAt: number;
}

export interface Receipt {
  id: string;
  imageUri: string;
  rawOcrText: string;
  storeName?: string;
  storeAddress?: string;
  currency: string;
  totalAmount?: number;
  detectedLanguage?: string;
  scanDate: number;
  createdAt: number;
}

export interface ExpenseItem {
  id: string;
  receiptId: string;
  name: string;
  nameTranslated?: string;
  category: ExpenseCategory;
  subcategory?: string;
  quantity: number;
  unit: Unit;
  unitPrice?: number;
  totalPrice: number;
  currency: string;
  purchaseDate: number;
  expiryDate?: number;
  brand?: string;
  barcode?: string;
  tags: string[];
  notes?: string;
  createdAt: number;
}

export interface NutritionProfile {
  id: string;
  expenseItemId: string;
  source: NutritionSource;
  servingSizeG?: number;
  servingsPerContainer?: number;
  calories?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  fiberG?: number;
  sugarG?: number;
  saturatedFatG?: number;
  transFatG?: number;
  unsaturatedFatG?: number;
  sodiumMg?: number;
  potassiumMg?: number;
  calciumMg?: number;
  ironMg?: number;
  magnesiumMg?: number;
  vitaminAMcg?: number;
  vitaminCMg?: number;
  vitaminDMcg?: number;
  vitaminEMg?: number;
  vitaminKMcg?: number;
  vitaminB1Mg?: number;
  vitaminB2Mg?: number;
  vitaminB3Mg?: number;
  vitaminB6Mg?: number;
  vitaminB12Mcg?: number;
  folateMcg?: number;
  zincMg?: number;
  seleniumMcg?: number;
  cholesterolMg?: number;
  aiConfidenceScore?: number;
  rawLabelText?: string;
  createdAt: number;
}

export interface DailyNutritionLog {
  id: string;
  userId: string;
  logDate: number;
  expenseItemId: string;
  consumedServings: number;
  calories?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  fiberG?: number;
  sugarG?: number;
  sodiumMg?: number;
  confidenceScore?: number;
  source?: NutritionSource;
  createdAt: number;
}

export interface NutritionAnalyticsMetric {
  key: NutrientMetricKey;
  recentAvg: number;
  median: number;
  p90: number;
  zScore: number;
  trendSlope: number;
  targetGapRatio: number;
}

export interface NutritionAnalyticsSnapshot {
  id: string;
  userId: string;
  fromTs: number;
  toTs: number;
  reliabilityScore: number;
  coverageScore: number;
  anomalyCount: number;
  metrics: NutritionAnalyticsMetric[];
  createdAt: number;
}

export interface ConsumptionModel {
  id: string;
  userId: string;
  expenseItemId: string;
  avgDailyServings: number;
  trendSlope: number;
  variability: number;
  confidence: number;
  lastPredictedDepletion?: number;
  updatedAt: number;
}

export interface HealthAlert {
  id: string;
  userId: string;
  alertType: AlertType;
  nutrientKey?: string;
  currentValue?: number;
  targetValue?: number;
  severity: AlertSeverity;
  message: string;
  messageTranslated?: string;
  isRead: 0 | 1;
  triggeredAt: number;
}

export interface ParsedLineItem {
  rawName: string;
  quantity: number;
  unit: Unit;
  unitPrice: number;
  totalPrice: number;
  confidence: number;
  confidenceBand?: "high" | "medium" | "low";
}

export interface ParsedReceipt {
  storeName: string;
  date: number;
  currency: string;
  detectedLanguage: string;
  items: ParsedLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  confidence: number;
  rawText: string;
}

export interface NutritionAggregate {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sugarG: number;
  sodiumMg: number;
}
