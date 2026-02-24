import { detectLanguage } from "@/modules/translate/language-detector";

const quickDictionary: Record<string, Record<string, string>> = {
  es: {
    leche: "milk",
    pan: "bread",
    arroz: "rice",
    total: "total",
  },
  fr: {
    lait: "milk",
    pain: "bread",
    riz: "rice",
    total: "total",
  },
  de: {
    milch: "milk",
    brot: "bread",
    reis: "rice",
    gesamt: "total",
  },
};

function quickTranslateWord(word: string, source: string): string {
  const table = quickDictionary[source];
  if (!table) return word;
  return table[word.toLowerCase()] ?? word;
}

export async function detectAndTranslate(
  text: string,
  targetLocale = "en",
): Promise<{
  detectedLanguage: string;
  confidence: number;
  translatedText: string;
  translationSource: "on-device" | "api";
}> {
  const detection = detectLanguage(text);
  if (detection.detectedLanguage === targetLocale) {
    return {
      detectedLanguage: targetLocale,
      confidence: detection.confidence,
      translatedText: text,
      translationSource: "on-device",
    };
  }

  const translated = text
    .split(/\s+/)
    .map((token) => quickTranslateWord(token, detection.detectedLanguage))
    .join(" ");

  return {
    detectedLanguage: detection.detectedLanguage,
    confidence: detection.confidence,
    translatedText: translated,
    translationSource: "on-device",
  };
}
