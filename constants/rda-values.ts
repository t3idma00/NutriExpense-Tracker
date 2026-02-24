export interface DailyTargets {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sugarG: number;
  sodiumMg: number;
  vitaminCMg: number;
  calciumMg: number;
  ironMg: number;
}

export const DEFAULT_DAILY_TARGETS: DailyTargets = {
  calories: 2000,
  proteinG: 75,
  carbsG: 250,
  fatG: 70,
  fiberG: 28,
  sugarG: 50,
  sodiumMg: 2300,
  vitaminCMg: 90,
  calciumMg: 1000,
  ironMg: 18,
};

export const ACTIVITY_MULTIPLIER = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
} as const;
