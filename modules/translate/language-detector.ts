const hints: Array<{ code: string; words: string[] }> = [
  { code: "es", words: ["gracias", "total", "precio", "impuesto", "leche"] },
  { code: "fr", words: ["merci", "total", "prix", "taxe", "lait"] },
  { code: "de", words: ["danke", "gesamt", "preis", "steuer", "milch"] },
];

export function detectLanguage(text: string): {
  detectedLanguage: string;
  confidence: number;
  alternatives: string[];
} {
  const lower = text.toLowerCase();
  let best = { code: "en", score: 0 };

  for (const hint of hints) {
    const score = hint.words.reduce(
      (sum, word) => sum + (lower.includes(word) ? 1 : 0),
      0,
    );
    if (score > best.score) {
      best = { code: hint.code, score };
    }
  }

  if (/[一-龥]/.test(text)) return { detectedLanguage: "zh", confidence: 0.9, alternatives: ["en"] };
  if (/[ぁ-んァ-ン]/.test(text)) return { detectedLanguage: "ja", confidence: 0.9, alternatives: ["en"] };
  if (/[ء-ي]/.test(text)) return { detectedLanguage: "ar", confidence: 0.9, alternatives: ["en"] };

  const confidence = best.score > 0 ? Math.min(0.95, 0.55 + best.score * 0.12) : 0.5;
  return {
    detectedLanguage: best.code,
    confidence,
    alternatives: best.code === "en" ? ["es", "fr"] : ["en"],
  };
}
