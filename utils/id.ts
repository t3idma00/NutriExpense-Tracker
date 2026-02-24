import * as Crypto from "expo-crypto";

export function createId(): string {
  if (typeof Crypto.randomUUID === "function") {
    return Crypto.randomUUID();
  }

  const suffix = Math.random().toString(36).slice(2, 10);
  return `id_${Date.now()}_${suffix}`;
}
