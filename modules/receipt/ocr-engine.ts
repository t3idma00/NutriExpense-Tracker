import { parseReceiptText } from "@/modules/receipt/receipt-parser";
import type { ParsedReceipt } from "@/types";

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

export interface OcrPipelineInput {
  imageUri: string;
  rawTextOverride?: string;
}

export interface OcrPipelineResult {
  parsed: ParsedReceipt;
  stages: Array<{ stage: string; completedAt: number }>;
}

export async function runReceiptOcrPipeline(
  input: OcrPipelineInput,
): Promise<OcrPipelineResult> {
  const stages: OcrPipelineResult["stages"] = [];

  const stage = (name: string) => {
    stages.push({ stage: name, completedAt: Date.now() });
  };

  stage("enhance-image");

  const extractedText = input.rawTextOverride?.trim()
    ? input.rawTextOverride
    : fallbackTextFromImage(input.imageUri);

  stage("ocr-text");
  const parsed = parseReceiptText(extractedText);
  stage("parse-items");

  if (parsed.confidence < 0.7) {
    parsed.items = parsed.items.map((item) => ({
      ...item,
      confidence: Math.min(item.confidence, 0.69),
    }));
  }

  stage("validate");

  return { parsed, stages };
}
