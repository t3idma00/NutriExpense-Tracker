import { create } from "zustand";
import type { ParsedReceipt } from "@/types";

interface ScanState {
  receiptImageUri?: string;
  rawTextOverride?: string;
  parsedReceipt?: ParsedReceipt;
  setReceiptDraft: (input: { imageUri: string; rawTextOverride?: string }) => void;
  setParsedReceipt: (parsed: ParsedReceipt) => void;
  clearDraft: () => void;
}

export const useScanStore = create<ScanState>((set) => ({
  receiptImageUri: undefined,
  rawTextOverride: undefined,
  parsedReceipt: undefined,
  setReceiptDraft: ({ imageUri, rawTextOverride }) =>
    set({ receiptImageUri: imageUri, rawTextOverride }),
  setParsedReceipt: (parsed) => set({ parsedReceipt: parsed }),
  clearDraft: () =>
    set({ receiptImageUri: undefined, rawTextOverride: undefined, parsedReceipt: undefined }),
}));
