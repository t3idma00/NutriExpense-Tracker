import { useEffect, useState } from "react";
import { Image, View } from "react-native";
import { router } from "expo-router";
import { ActivityIndicator, Card, ProgressBar, Text } from "react-native-paper";
import { Screen } from "@/components/layout/screen";
import { runReceiptOcrPipeline } from "@/modules/receipt/ocr-engine";
import { preprocessReceiptImage } from "@/utils/image-processor";
import { useScanStore } from "@/store/scan-store";

const progressSteps = [
  "Enhancing image...",
  "Reading text...",
  "Parsing items...",
  "Validating totals...",
] as const;

export default function ProcessingScreen() {
  const imageUri = useScanStore((s) => s.receiptImageUri);
  const rawTextOverride = useScanStore((s) => s.rawTextOverride);
  const setParsedReceipt = useScanStore((s) => s.setParsedReceipt);
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
        const result = await runReceiptOcrPipeline({
          imageUri: processedUri,
          rawTextOverride,
        });
        if (cancelled) return;
        setStep(3);
        setParsedReceipt(result.parsed);
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
  }, [imageUri, rawTextOverride, setParsedReceipt]);

  return (
    <Screen scroll={false} style={{ justifyContent: "center", gap: 16 }}>
      <Text variant="headlineSmall">Processing Receipt</Text>
      <Text style={{ color: "#6B7280" }}>
        {error ? error : progressSteps[Math.min(step, progressSteps.length - 1)]}
      </Text>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={{ width: "100%", height: 280, borderRadius: 16 }} />
      ) : null}
      <Card>
        <Card.Content style={{ gap: 10 }}>
          <ProgressBar progress={(step + 1) / progressSteps.length} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <ActivityIndicator />
            <Text>{progressSteps[Math.min(step, progressSteps.length - 1)]}</Text>
          </View>
        </Card.Content>
      </Card>
    </Screen>
  );
}
