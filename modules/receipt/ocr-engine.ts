import { parseReceiptText } from "@/modules/receipt/receipt-parser";
import type { ParsedLineItem, ParsedReceipt } from "@/types";
import {
  convertGeminiReceiptToParsed,
  extractReceiptTextFromImage,
  isCloudReceiptOcrEnabled,
  type GeminiStructuredReceipt,
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

export interface OcrPipelineInput {
  imageUri: string;
  rawTextOverride?: string;
}

export interface OcrPipelineResult {
  parsed: ParsedReceipt;
  geminiReceipt?: GeminiStructuredReceipt;
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

  // Path 1: Raw text override (testing/demo mode)
  if (input.rawTextOverride?.trim()) {
    stage("ocr-primary");
    stage("parse-items");
    const parsed = parseReceiptText(input.rawTextOverride);
    parsed.items = decorateItems(parsed.items, 0.98);
    parsed.confidence = Math.max(parsed.confidence, 0.95);
    stage("validate");

    return {
      parsed,
      stages,
      ocrMeta: {
        primaryConfidence: 0.98,
        fallbackConfidence: 0.98,
        agreementScore: 1,
        effectiveConfidence: 0.98,
        primarySource: "raw_override",
        usedDemoFallback: false,
        cloudEnabled: isCloudReceiptOcrEnabled(),
      },
    };
  }

  // Path 2: Gemini structured extraction (primary — smart parsing)
  stage("ocr-primary");
  const attempt = await extractReceiptTextFromImage(input.imageUri);

  if (attempt.structuredReceipt) {
    stage("parse-items");
    console.log("[ocr-engine] Using Gemini structured receipt (smart parsing)");

    const parsed = convertGeminiReceiptToParsed(attempt.structuredReceipt);
    const effectiveConfidence = parsed.confidence;
    parsed.items = decorateItems(parsed.items, effectiveConfidence);

    stage("validate");

    return {
      parsed,
      geminiReceipt: attempt.structuredReceipt,
      stages,
      ocrMeta: {
        primaryConfidence: attempt.extraction?.confidence ?? effectiveConfidence,
        fallbackConfidence: effectiveConfidence,
        agreementScore: 1,
        effectiveConfidence,
        primarySource: "gemini_vision",
        usedDemoFallback: false,
        cloudEnabled: true,
      },
    };
  }

  // Path 3: Gemini returned raw text but no structured data — use regex parser
  if (attempt.extraction?.text) {
    stage("parse-items");
    console.log("[ocr-engine] Falling back to text-based parsing");

    const parsed = parseReceiptText(attempt.extraction.text);
    const effectiveConfidence = Math.max(0.45, attempt.extraction.confidence * 0.8);
    parsed.items = decorateItems(parsed.items, effectiveConfidence);
    parsed.confidence = Math.max(parsed.confidence * 0.75, effectiveConfidence);

    stage("validate");

    return {
      parsed,
      stages,
      ocrMeta: {
        primaryConfidence: attempt.extraction.confidence,
        fallbackConfidence: effectiveConfidence,
        agreementScore: 0.5,
        effectiveConfidence,
        primarySource: attempt.extraction.source,
        usedDemoFallback: false,
        cloudEnabled: isCloudReceiptOcrEnabled(),
      },
    };
  }

  // Cloud OCR is configured but failed entirely
  if (isCloudReceiptOcrEnabled()) {
    throw new Error(
      attempt.errorMessage ??
        "Cloud OCR failed. Check Gemini API key, quota, or network and retry.",
    );
  }

  // Path 4: No cloud OCR — use demo fallback
  stage("parse-items");
  const demoText = fallbackTextFromImage(input.imageUri);
  const parsed = parseReceiptText(demoText);
  parsed.items = decorateItems(parsed.items, 0.74);
  stage("validate");

  return {
    parsed,
    stages,
    ocrMeta: {
      primaryConfidence: 0.74,
      fallbackConfidence: 0.68,
      agreementScore: 0.5,
      effectiveConfidence: 0.74,
      primarySource: "demo_fallback",
      usedDemoFallback: true,
      cloudEnabled: false,
    },
  };
}
