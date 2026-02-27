import * as FileSystem from "expo-file-system/legacy";

interface OcrSpaceParsedResult {
  ParsedText?: string;
  MeanConfidence?: number;
}

interface OcrSpaceResponse {
  IsErroredOnProcessing?: boolean;
  ErrorMessage?: string[] | string;
  ParsedResults?: OcrSpaceParsedResult[];
}

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

export interface ReceiptOcrExtraction {
  text: string;
  confidence: number;
  source: "ocr_space" | "gemini_vision";
}

export interface ReceiptOcrAttempt {
  extraction: ReceiptOcrExtraction | null;
  errorMessage?: string;
}

const GEMINI_REQUEST_TIMEOUT_MS = 30000;

function uniqueModels(models: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const model of models) {
    const value = model?.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    output.push(value);
  }
  return output;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function inferConfidenceFromText(text: string): number {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const receiptSignals = [
    /subtotal/i.test(text),
    /total/i.test(text),
    /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/.test(text),
    /\d+(?:[\.,]\d{2})/.test(text),
  ].filter(Boolean).length;
  const densityScore = clamp(lines.length / 16, 0.2, 1);
  const signalScore = clamp(receiptSignals / 4, 0.2, 1);
  return clamp(densityScore * 0.55 + signalScore * 0.45, 0.45, 0.9);
}

function extractOcrSpaceKey(): string | undefined {
  const key = process.env.EXPO_PUBLIC_OCR_SPACE_API_KEY?.trim();
  return key || undefined;
}

function extractGeminiKey(): string | undefined {
  const key = process.env.EXPO_PUBLIC_GEMINI_API_KEY?.trim();
  return key || undefined;
}

function detectMimeType(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".heic")) return "image/heic";
  return "image/jpeg";
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
    throw new Error("Gemini OCR response did not contain valid JSON.");
  }
}

function compactErrorMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : String(error);
  if (!message) return fallback;
  return message.length > 260 ? `${message.slice(0, 260)}...` : message;
}

async function callGeminiReceiptOcr(input: {
  apiKey: string;
  model: string;
  base64Image: string;
  mimeType: string;
}): Promise<string> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    input.model,
  )}:generateContent?key=${encodeURIComponent(input.apiKey)}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: "You are a receipt OCR engine. Return only JSON." }],
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text:
                  "Extract all readable receipt text from this image preserving line breaks. " +
                  'Return JSON: {"text":"...", "confidence":0-1}.',
              },
              {
                inline_data: {
                  mime_type: input.mimeType,
                  data: input.base64Image,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.05,
          maxOutputTokens: 1600,
          responseMimeType: "application/json",
        },
      }),
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`Gemini receipt OCR timed out after ${GEMINI_REQUEST_TIMEOUT_MS}ms.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Gemini receipt OCR failed (${input.model}): ${response.status} ${details.slice(0, 220)}`,
    );
  }

  const payload = (await response.json()) as GeminiGenerateContentResponse;
  const text = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("\n")
    .trim();
  if (!text) {
    throw new Error(`Gemini receipt OCR returned empty response (${input.model}).`);
  }
  return text;
}

async function extractReceiptTextViaGemini(
  imageUri: string,
): Promise<ReceiptOcrAttempt> {
  const apiKey = extractGeminiKey();
  console.log(`[receipt-ocr] Gemini API key present: ${Boolean(apiKey)}`);
  if (!apiKey) {
    return {
      extraction: null,
      errorMessage: "Gemini OCR unavailable: EXPO_PUBLIC_GEMINI_API_KEY missing.",
    };
  }

  let base64Image: string;
  try {
    base64Image = await FileSystem.readAsStringAsync(imageUri, {
      encoding: "base64",
    });
  } catch (error) {
    return {
      extraction: null,
      errorMessage: compactErrorMessage(error, "Could not read captured image for Gemini OCR."),
    };
  }

  if (!base64Image) {
    return {
      extraction: null,
      errorMessage: "Captured image was empty for Gemini OCR.",
    };
  }

  const mimeType = detectMimeType(imageUri);
  const models = uniqueModels([
    process.env.EXPO_PUBLIC_GEMINI_MODEL?.trim(),
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-001",
    "gemini-2.0-flash-lite-001",
  ]);

  let lastError = "Gemini OCR could not extract text from this receipt image.";

  for (const model of models) {
    try {
      console.log(`[receipt-ocr] Trying Gemini model: ${model}, image size: ${base64Image.length} chars`);
      const raw = await callGeminiReceiptOcr({
        apiKey,
        model,
        base64Image,
        mimeType,
      });
      console.log(`[receipt-ocr] Gemini (${model}) responded, parsing...`);
      const json = extractJsonFromText(raw) as { text?: string; confidence?: number };
      const text = json.text?.trim();
      if (!text || text.length < 16) {
        lastError = `Gemini OCR (${model}) returned insufficient text.`;
        console.log(`[receipt-ocr] ${lastError}`);
        continue;
      }

      const confidence =
        typeof json.confidence === "number"
          ? clamp(json.confidence, 0.35, 0.99)
          : inferConfidenceFromText(text);

      return {
        extraction: {
          text,
          confidence,
          source: "gemini_vision",
        },
      };
    } catch (error) {
      lastError = compactErrorMessage(error, `Gemini OCR failed (${model}).`);
      console.warn(`[receipt-ocr] ${lastError}`);
    }
  }

  return {
    extraction: null,
    errorMessage: lastError,
  };
}

async function extractReceiptTextViaOcrSpace(
  imageUri: string,
): Promise<ReceiptOcrAttempt> {
  const apiKey = extractOcrSpaceKey();
  if (!apiKey) {
    return { extraction: null };
  }

  let base64Image: string;
  try {
    base64Image = await FileSystem.readAsStringAsync(imageUri, {
      encoding: "base64",
    });
  } catch (error) {
    return {
      extraction: null,
      errorMessage: compactErrorMessage(error, "Could not read captured image for OCR.Space."),
    };
  }

  if (!base64Image) {
    return {
      extraction: null,
      errorMessage: "Captured image was empty for OCR.Space OCR.",
    };
  }

  const formData = new FormData();
  formData.append("base64Image", `data:image/jpeg;base64,${base64Image}`);
  formData.append("language", "eng");
  formData.append("scale", "true");
  formData.append("isTable", "false");
  formData.append("OCREngine", "2");

  let response: Response;
  try {
    response = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      headers: {
        apikey: apiKey,
      },
      body: formData,
    });
  } catch (error) {
    return {
      extraction: null,
      errorMessage: compactErrorMessage(error, "OCR.Space request failed."),
    };
  }

  if (!response.ok) {
    const details = await response.text();
    return {
      extraction: null,
      errorMessage: `OCR.Space failed: ${response.status} ${details.slice(0, 180)}`,
    };
  }

  let parsed: OcrSpaceResponse;
  try {
    parsed = (await response.json()) as OcrSpaceResponse;
  } catch (error) {
    return {
      extraction: null,
      errorMessage: compactErrorMessage(error, "OCR.Space returned invalid JSON."),
    };
  }

  if (parsed.IsErroredOnProcessing) {
    const details = Array.isArray(parsed.ErrorMessage)
      ? parsed.ErrorMessage.join(" | ")
      : parsed.ErrorMessage || "unknown OCR.Space processing error";
    return {
      extraction: null,
      errorMessage: `OCR.Space processing error: ${details}`,
    };
  }

  const text = parsed.ParsedResults?.[0]?.ParsedText?.trim();
  if (!text) {
    return {
      extraction: null,
      errorMessage: "OCR.Space returned no readable text.",
    };
  }

  const meanConfidence = parsed.ParsedResults?.[0]?.MeanConfidence;
  const confidence =
    typeof meanConfidence === "number"
      ? clamp(meanConfidence / 100, 0.35, 0.99)
      : inferConfidenceFromText(text);

  return {
    extraction: {
      text,
      confidence,
      source: "ocr_space",
    },
  };
}

export function isCloudReceiptOcrEnabled(): boolean {
  return Boolean(extractGeminiKey() || extractOcrSpaceKey());
}

export async function extractReceiptTextFromImage(
  imageUri: string,
): Promise<ReceiptOcrAttempt> {
  const geminiAttempt = await extractReceiptTextViaGemini(imageUri);
  if (geminiAttempt.extraction) return geminiAttempt;

  const ocrSpaceAttempt = await extractReceiptTextViaOcrSpace(imageUri);
  if (ocrSpaceAttempt.extraction) return ocrSpaceAttempt;

  const messages = [geminiAttempt.errorMessage, ocrSpaceAttempt.errorMessage]
    .filter((entry): entry is string => Boolean(entry))
    .join(" | ");

  return {
    extraction: null,
    errorMessage: messages || "Cloud OCR failed.",
  };
}
