import type { ActivityLevel, Gender, HealthGoal, UserProfile } from "@/types";
import { ACTIVITY_MULTIPLIER, DEFAULT_DAILY_TARGETS } from "@/constants/rda-values";

interface BodyMetrics {
  weightKg: number;
  heightCm: number;
  age: number;
  gender: Gender;
}

export function calculateBmr(metrics: BodyMetrics): number {
  const base =
    10 * metrics.weightKg + 6.25 * metrics.heightCm - 5 * metrics.age;
  if (metrics.gender === "male") return base + 5;
  if (metrics.gender === "female") return base - 161;
  return base - 78;
}

export function calculateTdee(bmr: number, activityLevel: ActivityLevel): number {
  return bmr * ACTIVITY_MULTIPLIER[activityLevel];
}

export function calculateBmi(weightKg: number, heightCm: number): number {
  const meters = heightCm / 100;
  return weightKg / (meters * meters);
}

function proteinTarget(weightKg: number, goals: HealthGoal[]): number {
  if (goals.includes("muscle_gain")) return weightKg * 2;
  if (goals.includes("weight_loss")) return weightKg * 1.6;
  return weightKg * 1.2;
}

export function calculateMacroTargets(
  calories: number,
  weightKg: number,
  goals: HealthGoal[],
) {
  const proteinG = proteinTarget(weightKg, goals);
  const fatG = (calories * 0.28) / 9;
  const carbsG = Math.max(0, (calories - proteinG * 4 - fatG * 9) / 4);
  return { proteinG, carbsG, fatG };
}

export function buildUserTargets(profile: Partial<UserProfile>) {
  if (!profile.weightKg || !profile.heightCm || !profile.age || !profile.gender) {
    return DEFAULT_DAILY_TARGETS;
  }

  const bmr = calculateBmr({
    weightKg: profile.weightKg,
    heightCm: profile.heightCm,
    age: profile.age,
    gender: profile.gender,
  });
  const tdee = calculateTdee(bmr, profile.activityLevel ?? "moderate");
  const macros = calculateMacroTargets(tdee, profile.weightKg, profile.healthGoals ?? []);

  return {
    ...DEFAULT_DAILY_TARGETS,
    calories: Math.round(tdee),
    proteinG: Math.round(macros.proteinG),
    carbsG: Math.round(macros.carbsG),
    fatG: Math.round(macros.fatG),
  };
}
