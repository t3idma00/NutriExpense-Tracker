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

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
    finishReason?: string;
  }>;
}

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
    const parsed = JSON.parse(raw) as {
      expiresAt: number;
      payload: AIInferredNutrition;
    };
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

function extractJsonFromText(rawText: string): unknown {
  const fenced = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? rawText).trim();

  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1));
    }
    throw new Error("AI response did not contain valid JSON.");
  }
}

async function callGeminiModel(input: {
  model: string;
  apiKey: string;
  systemPrompt: string;
  userPrompt: string;
}): Promise<string> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    input.model,
  )}:generateContent?key=${encodeURIComponent(input.apiKey)}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: input.systemPrompt }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: input.userPrompt }],
        },
      ],
      generationConfig: {
        temperature: 0.15,
        maxOutputTokens: 800,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Gemini inference failed (${input.model}): ${response.status} ${details.slice(0, 220)}`,
    );
  }

  const json = (await response.json()) as GeminiGenerateContentResponse;
  const text = json.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("\n")
    .trim();

  if (!text) {
    throw new Error(`Gemini inference returned empty response (${input.model}).`);
  }

  return text;
}

async function inferWithGemini(input: {
  apiKey: string;
  systemPrompt: string;
  userPrompt: string;
}): Promise<AIInferredNutrition> {
  const modelCandidates = [
    process.env.EXPO_PUBLIC_GEMINI_MODEL?.trim(),
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-001",
    "gemini-2.0-flash-lite-001",
  ].filter((value): value is string => Boolean(value));

  let lastError: Error | null = null;
  for (const model of modelCandidates) {
    try {
      const rawText = await callGeminiModel({
        model,
        apiKey: input.apiKey,
        systemPrompt: input.systemPrompt,
        userPrompt: input.userPrompt,
      });
      return aiResponseSchema.parse(extractJsonFromText(rawText));
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError ?? new Error("Gemini inference failed for all model candidates.");
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

  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    const estimate = heuristicEstimate(item.name);
    const payload = aiResponseSchema.parse({
      ...estimate,
      servings_per_package: 1,
      per_serving: estimate.per_100g,
      confidence: 0.62,
      notes: "Offline heuristic estimate (no Gemini API key found).",
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

  const extracted = await inferWithGemini({
    apiKey,
    systemPrompt,
    userPrompt,
  });

  await cache(item.name, extracted);
  return extracted;
}
