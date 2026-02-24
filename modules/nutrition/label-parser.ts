import { z } from "zod";
import type { NutritionProfile } from "@/types";

const nutritionLabelSchema = z.object({
  servingSizeG: z.number().positive().optional(),
  servingsPerContainer: z.number().positive().optional(),
  calories: z.number().nonnegative().optional(),
  proteinG: z.number().nonnegative().optional(),
  carbsG: z.number().nonnegative().optional(),
  fatG: z.number().nonnegative().optional(),
  fiberG: z.number().nonnegative().optional(),
  sugarG: z.number().nonnegative().optional(),
  sodiumMg: z.number().nonnegative().optional(),
  confidence: z.number().min(0).max(1),
});

function parseNumber(text: string, pattern: RegExp): number | undefined {
  const match = text.match(pattern);
  if (!match?.[1]) return undefined;
  const parsed = Number(match[1].replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseNutritionLabel(rawText: string): {
  values: Partial<NutritionProfile>;
  confidence: number;
} {
  const text = rawText.replace(/\r/g, " ");
  const values = {
    servingSizeG:
      parseNumber(text, /serving size[^\d]*(\d+(?:\.\d+)?)\s*g/i) ??
      parseNumber(text, /(\d+(?:\.\d+)?)\s*g\s*serving/i),
    servingsPerContainer: parseNumber(
      text,
      /servings per container[^\d]*(\d+(?:\.\d+)?)/i,
    ),
    calories: parseNumber(text, /calories[^\d]*(\d+(?:\.\d+)?)/i),
    fatG: parseNumber(text, /(total fat|fat)[^\d]*(\d+(?:\.\d+)?)\s*g/i),
    carbsG: parseNumber(
      text,
      /(total carbohydrate|carbohydrate|carbs)[^\d]*(\d+(?:\.\d+)?)\s*g/i,
    ),
    proteinG: parseNumber(text, /protein[^\d]*(\d+(?:\.\d+)?)\s*g/i),
    fiberG: parseNumber(text, /(fiber|dietary fiber)[^\d]*(\d+(?:\.\d+)?)\s*g/i),
    sugarG: parseNumber(text, /(sugar|total sugars)[^\d]*(\d+(?:\.\d+)?)\s*g/i),
    sodiumMg: parseNumber(text, /sodium[^\d]*(\d+(?:\.\d+)?)\s*mg/i),
  };

  const macroCalories =
    (values.fatG ?? 0) * 9 +
    (values.proteinG ?? 0) * 4 +
    (values.carbsG ?? 0) * 4;
  const calories = values.calories ?? 0;
  const mismatch = calories > 0 ? Math.abs(macroCalories - calories) / calories : 0;
  const extractedCount = Object.values(values).filter(
    (entry) => typeof entry === "number",
  ).length;
  const confidence = Math.max(
    0.4,
    Math.min(0.98, extractedCount / 9 - Math.min(mismatch, 0.4) * 0.5),
  );

  nutritionLabelSchema.parse({
    ...values,
    confidence,
  });

  return { values, confidence };
}
