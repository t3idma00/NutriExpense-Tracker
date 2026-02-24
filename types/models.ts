export type Gender = "male" | "female" | "other";
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
  createdAt: number;
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
