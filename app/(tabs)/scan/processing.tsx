import { useEffect, useState } from "react";
import { Image, View } from "react-native";
import { router } from "expo-router";
import { ActivityIndicator, Card, ProgressBar, Text } from "react-native-paper";
import { Screen } from "@/components/layout/screen";
import { runReceiptOcrPipeline } from "@/modules/receipt/ocr-engine";
import { useScanStore } from "@/store/scan-store";
import { preprocessReceiptImage } from "@/utils/image-processor";

const progressSteps = [
  "Enhancing image...",
  "Reading text (primary OCR)...",
  "Reading text (fallback OCR)...",
  "Parsing items...",
  "Validating totals...",
] as const;

export default function ProcessingScreen() {
  const imageUri = useScanStore((s) => s.receiptImageUri);
  const rawTextOverride = useScanStore((s) => s.rawTextOverride);
  const setParsedReceipt = useScanStore((s) => s.setParsedReceipt);
  const setOcrMeta = useScanStore((s) => s.setOcrMeta);
  const setGeminiReceipt = useScanStore((s) => s.setGeminiReceipt);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!imageUri) {
      router.replace("/(tabs)/scan/receipt");
      return;
    }

    let cancelled = false;
    const run = async () => {
      try {
        setStep(0);
        const processedUri = await preprocessReceiptImage(imageUri);
        if (cancelled) return;
        setStep(1);

        await new Promise((resolve) => setTimeout(resolve, 450));
        setStep(2);
        const result = await runReceiptOcrPipeline({
          imageUri: processedUri,
          rawTextOverride,
        });
        if (cancelled) return;
        setStep(3);
        await new Promise((resolve) => setTimeout(resolve, 150));
        setStep(4);
        setParsedReceipt(result.parsed);
        setOcrMeta(result.ocrMeta);
        if (result.geminiReceipt) {
          setGeminiReceipt(result.geminiReceipt);
        }
        setTimeout(() => router.replace("/(tabs)/scan/review"), 500);
      } catch (entry) {
        if (cancelled) return;
        setError(entry instanceof Error ? entry.message : "Failed to process receipt.");
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [imageUri, rawTextOverride, setParsedReceipt, setOcrMeta, setGeminiReceipt]);

  return (
    <Screen scroll={false} style={{ justifyContent: "center", gap: 16 }}>
      <Card style={{ borderRadius: 22, backgroundColor: "#EDF3FB" }}>
        <Card.Content style={{ gap: 8 }}>
          <Text variant="headlineSmall" style={{ fontWeight: "800", color: "#153A5E" }}>
            Processing receipt
          </Text>
          <Text style={{ color: "#5B6F84" }}>
            {error ? error : progressSteps[Math.min(step, progressSteps.length - 1)]}
          </Text>
        </Card.Content>
      </Card>

      {imageUri ? (
        <Image source={{ uri: imageUri }} style={{ width: "100%", height: 260, borderRadius: 18 }} />
      ) : null}

      <Card style={{ borderRadius: 20, backgroundColor: "#F8FAFD" }}>
        <Card.Content style={{ gap: 10 }}>
          <ProgressBar
            progress={(step + 1) / progressSteps.length}
            color="#1F4E82"
            style={{ height: 8, borderRadius: 999, backgroundColor: "#DEE8F4" }}
          />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <ActivityIndicator color="#1F4E82" />
            <Text style={{ color: "#2B425C" }}>{progressSteps[Math.min(step, progressSteps.length - 1)]}</Text>
          </View>
        </Card.Content>
      </Card>
    </Screen>
  );
}
