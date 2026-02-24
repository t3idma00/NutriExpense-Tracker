import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";

const CACHE_PREFIX = "ai_nutrition_";
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const aiResponseSchema = z.object({
  serving_size_g: z.number().positive(),
  servings_per_package: z.number().positive().optional(),
  per_100g: z.object({
    calories: z.number(),
    protein_g: z.number(),
    carbs_g: z.number(),
    fat_g: z.number(),
    fiber_g: z.number().optional(),
    sugar_g: z.number().optional(),
    sodium_mg: z.number().optional(),
  }),
  per_serving: z.object({
    calories: z.number(),
    protein_g: z.number(),
    carbs_g: z.number(),
    fat_g: z.number(),
    fiber_g: z.number().optional(),
    sugar_g: z.number().optional(),
    sodium_mg: z.number().optional(),
  }),
  confidence: z.number().min(0).max(1),
  notes: z.string().optional(),
});

export type AIInferredNutrition = z.infer<typeof aiResponseSchema>;

function makeCacheKey(itemName: string): string {
  return `${CACHE_PREFIX}${itemName.toLowerCase().trim()}`;
}

function heuristicEstimate(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("chicken")) {
    return {
      serving_size_g: 100,
      per_100g: {
        calories: 165,
        protein_g: 31,
        carbs_g: 0,
        fat_g: 3.6,
        sodium_mg: 74,
      },
    };
  }
  if (lower.includes("bread")) {
    return {
      serving_size_g: 50,
      per_100g: {
        calories: 265,
        protein_g: 9,
        carbs_g: 49,
        fat_g: 3.2,
        fiber_g: 2.7,
        sugar_g: 5,
        sodium_mg: 490,
      },
    };
  }
  return {
    serving_size_g: 100,
    per_100g: {
      calories: 180,
      protein_g: 8,
      carbs_g: 20,
      fat_g: 7,
      fiber_g: 3,
      sugar_g: 5,
      sodium_mg: 240,
    },
  };
}

async function getCached(itemName: string): Promise<AIInferredNutrition | null> {
  const raw = await AsyncStorage.getItem(makeCacheKey(itemName));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { expiresAt: number; payload: AIInferredNutrition };
    if (Date.now() > parsed.expiresAt) {
      await AsyncStorage.removeItem(makeCacheKey(itemName));
      return null;
    }
    return parsed.payload;
  } catch {
    return null;
  }
}

async function cache(itemName: string, payload: AIInferredNutrition): Promise<void> {
  await AsyncStorage.setItem(
    makeCacheKey(itemName),
    JSON.stringify({ expiresAt: Date.now() + CACHE_TTL_MS, payload }),
  );
}

export async function inferNutritionFromText(item: {
  name: string;
  brand?: string;
  category: string;
  weight_g?: number;
  ingredients?: string;
  rawOcrText?: string;
}): Promise<AIInferredNutrition> {
  const cached = await getCached(item.name);
  if (cached) return cached;

  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (!apiKey) {
    const estimate = heuristicEstimate(item.name);
    const payload = aiResponseSchema.parse({
      ...estimate,
      servings_per_package: 1,
      per_serving: estimate.per_100g,
      confidence: 0.62,
      notes: "Offline heuristic estimate (no Anthropic API key found).",
    });
    await cache(item.name, payload);
    return payload;
  }

  const systemPrompt =
    "You are a professional nutritionist and food scientist. Return ONLY valid JSON.";
  const userPrompt = `Estimate detailed nutritional information for the following food item scanned from a shopping receipt.
Provide per-100g values and per-serving values.
Item: ${item.name}, Brand: ${item.brand ?? "unknown"}, Category: ${item.category}
Ingredients (if available): ${item.ingredients ?? "unknown"}
Return JSON with this exact schema: { serving_size_g, servings_per_package, per_100g: { calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg }, per_serving: { calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg }, confidence: 0-1, notes: string }`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 700,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`AI inference failed: ${response.status}`);
  }

  const json = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };

  const rawText = json.content?.find((entry) => entry.type === "text")?.text;
  if (!rawText) {
    throw new Error("AI inference returned empty response.");
  }

  const extracted = aiResponseSchema.parse(JSON.parse(rawText));
  await cache(item.name, extracted);
  return extracted;
}
