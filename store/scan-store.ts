import { create } from "zustand";
import type { ParsedReceipt } from "@/types";
import type { GeminiStructuredReceipt } from "@/services/receipt-ocr.service";

interface OcrMeta {
  primaryConfidence: number;
  fallbackConfidence: number;
  agreementScore: number;
  effectiveConfidence: number;
  primarySource: "raw_override" | "gemini_vision" | "ocr_space" | "demo_fallback";
  usedDemoFallback: boolean;
  cloudEnabled: boolean;
}

interface ScanState {
  receiptImageUri?: string;
  rawTextOverride?: string;
  parsedReceipt?: ParsedReceipt;
  ocrMeta?: OcrMeta;
  geminiReceipt?: GeminiStructuredReceipt;
  setReceiptDraft: (input: { imageUri: string; rawTextOverride?: string }) => void;
  setParsedReceipt: (parsed: ParsedReceipt) => void;
  setOcrMeta: (meta: OcrMeta) => void;
  setGeminiReceipt: (receipt: GeminiStructuredReceipt) => void;
  clearDraft: () => void;
}

export const useScanStore = create<ScanState>((set) => ({
  receiptImageUri: undefined,
  rawTextOverride: undefined,
  parsedReceipt: undefined,
  ocrMeta: undefined,
  geminiReceipt: undefined,
  setReceiptDraft: ({ imageUri, rawTextOverride }) =>
    set({ receiptImageUri: imageUri, rawTextOverride }),
  setParsedReceipt: (parsed) => set({ parsedReceipt: parsed }),
  setOcrMeta: (ocrMeta) => set({ ocrMeta }),
  setGeminiReceipt: (geminiReceipt) => set({ geminiReceipt }),
  clearDraft: () =>
    set({
      receiptImageUri: undefined,
      rawTextOverride: undefined,
      parsedReceipt: undefined,
      ocrMeta: undefined,
      geminiReceipt: undefined,
    }),
}));
