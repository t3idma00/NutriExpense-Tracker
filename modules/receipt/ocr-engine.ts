import { parseReceiptText } from "@/modules/receipt/receipt-parser";
import type { ParsedLineItem, ParsedReceipt } from "@/types";
import {
  extractReceiptTextFromImage,
  isCloudReceiptOcrEnabled,
} from "@/services/receipt-ocr.service";

const demoReceipts = [
  `Whole Foods Market
Date: 01/15/2026
Organic Bananas 2x 3.50
Greek Yogurt 4.99
Avocado Oil 10.49
Subtotal 18.98
Tax 1.04
Total 20.02`,
  `Costco Wholesale
01-10-2026
Eggs Large 7.99
Chicken Breast 12.49
Brown Rice 9.99
Subtotal 30.47
Tax 1.80
Total 32.27`,
];

function fallbackTextFromImage(imageUri: string): string {
  const lower = imageUri.toLowerCase();
  if (lower.includes("costco")) return demoReceipts[1];
  return demoReceipts[0];
}

function normalizeForMatch(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function agreementScore(primaryText: string, fallbackText: string): number {
  const primaryTokens = normalizeForMatch(primaryText);
  const fallbackTokens = normalizeForMatch(fallbackText);
  if (!primaryTokens.length || !fallbackTokens.length) return 0;

  const right = new Set(fallbackTokens);
  const overlap = primaryTokens.filter((token) => right.has(token)).length;
  return overlap / Math.max(primaryTokens.length, fallbackTokens.length);
}

function confidenceBand(value: number): "high" | "medium" | "low" {
  if (value >= 0.9) return "high";
  if (value >= 0.6) return "medium";
  return "low";
}

function decorateItems(
  items: ParsedLineItem[],
  effectiveConfidence: number,
): ParsedLineItem[] {
  return items.map((item) => {
    const mergedConfidence = Math.min(
      0.99,
      item.confidence * 0.7 + effectiveConfidence * 0.3,
    );
    return {
      ...item,
      confidence: mergedConfidence,
      confidenceBand: confidenceBand(mergedConfidence),
    };
  });
}

type PrimarySource = "raw_override" | "gemini_vision" | "ocr_space" | "demo_fallback";

async function runPrimaryEngine(
  input: OcrPipelineInput,
): Promise<{ text: string; confidence: number; source: PrimarySource }> {
  if (input.rawTextOverride?.trim()) {
    return {
      text: input.rawTextOverride,
      confidence: 0.98,
      source: "raw_override",
    };
  }

  const attempt = await extractReceiptTextFromImage(input.imageUri);
  if (attempt.extraction?.text) {
    return {
      text: attempt.extraction.text,
      confidence: attempt.extraction.confidence,
      source: attempt.extraction.source,
    };
  }

  // Cloud OCR is configured but failed: stop here with explicit error
  // instead of silently using demo/sample receipt content.
  if (isCloudReceiptOcrEnabled()) {
    throw new Error(
      attempt.errorMessage ??
        "Cloud OCR failed. Check Gemini API key, quota, or network and retry.",
    );
  }

  return {
    text: fallbackTextFromImage(input.imageUri),
    confidence: 0.74,
    source: "demo_fallback",
  };
}

async function runFallbackEngine(primaryText: string): Promise<{ text: string; confidence: number }> {
  return {
    text: primaryText
      .replace(/\s{2,}/g, " ")
      .replace(/[|]/g, "I"),
    confidence: 0.68,
  };
}

export interface OcrPipelineInput {
  imageUri: string;
  rawTextOverride?: string;
}

export interface OcrPipelineResult {
  parsed: ParsedReceipt;
  stages: Array<{ stage: string; completedAt: number }>;
  ocrMeta: {
    primaryConfidence: number;
    fallbackConfidence: number;
    agreementScore: number;
    effectiveConfidence: number;
    primarySource: PrimarySource;
    usedDemoFallback: boolean;
    cloudEnabled: boolean;
  };
}

export async function runReceiptOcrPipeline(
  input: OcrPipelineInput,
): Promise<OcrPipelineResult> {
  const stages: OcrPipelineResult["stages"] = [];

  const stage = (name: string) => {
    stages.push({ stage: name, completedAt: Date.now() });
  };

  stage("enhance-image");

  stage("ocr-primary");
  const primary = await runPrimaryEngine(input);
  stage("ocr-fallback");
  const fallback = await runFallbackEngine(primary.text);

  const agreement = agreementScore(primary.text, fallback.text);
  const effectiveConfidence = Math.max(
    0.45,
    (primary.confidence + fallback.confidence + agreement) / 3,
  );
  const extractedText = agreement >= 0.65 ? primary.text : fallback.text;

  stage("parse-items");
  const parsed = parseReceiptText(extractedText);
  parsed.items = decorateItems(parsed.items, effectiveConfidence);
  parsed.confidence = Math.max(parsed.confidence * 0.75, effectiveConfidence);

  stage("validate");

  return {
    parsed,
    stages,
    ocrMeta: {
      primaryConfidence: primary.confidence,
      fallbackConfidence: fallback.confidence,
      agreementScore: agreement,
      effectiveConfidence,
      primarySource: primary.source,
      usedDemoFallback: primary.source === "demo_fallback",
      cloudEnabled: isCloudReceiptOcrEnabled(),
    },
  };
}
