import { repositories } from "@/db/repositories";
import type { DailyNutritionLog, NutritionProfile, NutritionSource } from "@/types";
import { clamp } from "@/modules/analytics/statistics";

type NutrientField =
  | "calories"
  | "proteinG"
  | "carbsG"
  | "fatG"
  | "fiberG"
  | "sugarG"
  | "sodiumMg";

const nutrientFields: NutrientField[] = [
  "calories",
  "proteinG",
  "carbsG",
  "fatG",
  "fiberG",
  "sugarG",
  "sodiumMg",
];

function sourceWeight(source?: NutritionSource): number {
  if (source === "label_scan") return 0.96;
  if (source === "barcode_api") return 0.93;
  if (source === "manual") return 0.82;
  if (source === "ai_inferred") return 0.72;
  return 0.5;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function profileRecencyWeight(profile?: NutritionProfile | null): number {
  if (!profile?.createdAt) return 0.45;
  const ageDays = Math.max(0, (Date.now() - profile.createdAt) / 86_400_000);
  const score = Math.exp(-ageDays / 120);
  return clamp(score, 0.5, 1);
}

function profileConfidence(profile?: NutritionProfile | null): number {
  if (!profile) return 0.45;
  if (isFiniteNumber(profile.aiConfidenceScore)) {
    return clamp(profile.aiConfidenceScore, 0.2, 1);
  }
  if (profile.source === "label_scan" || profile.source === "barcode_api") return 0.92;
  if (profile.source === "manual") return 0.82;
  return 0.68;
}

function completenessScore(values: Partial<Record<NutrientField, number>>): number {
  const present = nutrientFields.filter((field) => isFiniteNumber(values[field])).length;
  return present / nutrientFields.length;
}

function buildNutrientValues(input: {
  profile?: NutritionProfile | null;
  consumedServings: number;
  log: Omit<DailyNutritionLog, "id" | "createdAt" | "userId" | "confidenceScore" | "source">;
}): Partial<Record<NutrientField, number>> {
  const servings = Math.max(0.1, input.log.consumedServings || input.consumedServings || 1);
  const provided = Object.fromEntries(
    nutrientFields.map((field) => [field, input.log[field]]),
  ) as Partial<Record<NutrientField, number>>;

  const hasAnyProvided = nutrientFields.some((field) => isFiniteNumber(provided[field]));
  const hasAnyPositive = nutrientFields.some(
    (field) => isFiniteNumber(provided[field]) && Number(provided[field]) > 0,
  );
  const shouldUseProvidedAsPrimary = hasAnyProvided && hasAnyPositive;

  const values: Partial<Record<NutrientField, number>> = {};
  for (const field of nutrientFields) {
    const directValue = provided[field];
    if (shouldUseProvidedAsPrimary && isFiniteNumber(directValue)) {
      values[field] = Math.max(0, directValue);
      continue;
    }

    const profileValue = input.profile?.[field];
    if (isFiniteNumber(profileValue)) {
      values[field] = Math.max(0, profileValue * servings);
      continue;
    }

    if (!shouldUseProvidedAsPrimary && isFiniteNumber(directValue) && directValue > 0) {
      values[field] = directValue;
    }
  }

  return values;
}

export async function buildResolvedConsumptionLog(input: {
  userId: string;
  log: Omit<DailyNutritionLog, "id" | "createdAt" | "userId" | "confidenceScore" | "source">;
}): Promise<Omit<DailyNutritionLog, "id" | "createdAt">> {
  const profile = await repositories.nutrition.getNutritionByItemId(input.log.expenseItemId);
  const nutrientValues = buildNutrientValues({
    profile,
    consumedServings: input.log.consumedServings,
    log: input.log,
  });

  const completeness = completenessScore(nutrientValues);
  const quality = clamp(
    0.15 +
      completeness * 0.35 +
      profileConfidence(profile) * 0.25 +
      profileRecencyWeight(profile) * 0.15 +
      sourceWeight(profile?.source) * 0.1,
    0,
    1,
  );

  return {
    ...input.log,
    userId: input.userId,
    ...nutrientValues,
    confidenceScore: quality,
    source: profile?.source ?? "manual",
  };
}
