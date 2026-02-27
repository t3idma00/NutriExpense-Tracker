import { useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { Button, Card, Snackbar, Text, TextInput } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Screen } from "@/components/layout/screen";
import { useExpense } from "@/hooks/use-expenses";
import { useNutritionProfile, useUpsertNutritionMutation } from "@/hooks/use-nutrition";
import { parseNutritionLabel } from "@/modules/nutrition/label-parser";
import {
  lookupNutritionByBarcode,
  resolveBarcodeFromInput,
} from "@/services/barcode-nutrition.service";
import { inferNutritionFromText } from "@/services/ai-nutrition.service";

function Row(props: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
      <Text style={{ color: "#60748C" }}>{props.label}</Text>
      <Text style={{ color: "#1F3550", fontWeight: "700", flex: 1, textAlign: "right" }}>
        {props.value}
      </Text>
    </View>
  );
}

export default function ItemNutritionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const expense = useExpense(id ?? "");
  const nutrition = useNutritionProfile(id ?? "");
  const upsert = useUpsertNutritionMutation();
  const [rawText, setRawText] = useState("");
  const [barcode, setBarcode] = useState("");
  const [status, setStatus] = useState<string>();

  const analyze = async () => {
    const item = expense.data;
    if (!item) return;

    const resolvedBarcode = await resolveBarcodeFromInput({
      barcodeRaw: barcode,
      rawText,
    });

    if (resolvedBarcode) {
      const barcodeProfile = await lookupNutritionByBarcode(resolvedBarcode);
      if (barcodeProfile) {
        await upsert.mutateAsync({
          expenseItemId: item.id,
          source: "barcode_api",
          servingSizeG: barcodeProfile.servingSizeG,
          calories: barcodeProfile.calories,
          proteinG: barcodeProfile.proteinG,
          carbsG: barcodeProfile.carbsG,
          fatG: barcodeProfile.fatG,
          fiberG: barcodeProfile.fiberG,
          sugarG: barcodeProfile.sugarG,
          sodiumMg: barcodeProfile.sodiumMg,
          aiConfidenceScore: barcodeProfile.confidence,
          rawLabelText: rawText || `Barcode: ${barcodeProfile.barcode}`,
        });
        setStatus(
          barcode.trim()
            ? "Saved from barcode nutrition lookup."
            : `Barcode detected from label text (${resolvedBarcode}). Saved from barcode lookup.`,
        );
        return;
      }
    }

    const parsed = parseNutritionLabel(rawText);
    if (parsed.confidence >= 0.75) {
      await upsert.mutateAsync({
        expenseItemId: item.id,
        source: "label_scan",
        rawLabelText: rawText,
        aiConfidenceScore: parsed.confidence,
        ...parsed.values,
      });
      setStatus("Saved from label scan parser.");
      return;
    }

    const ai = await inferNutritionFromText({
      name: item.name,
      brand: item.brand,
      category: item.category,
      rawOcrText: rawText,
    });
    await upsert.mutateAsync({
      expenseItemId: item.id,
      source: "ai_inferred",
      servingSizeG: ai.serving_size_g,
      servingsPerContainer: ai.servings_per_package ?? 1,
      calories: ai.per_serving.calories,
      proteinG: ai.per_serving.protein_g,
      carbsG: ai.per_serving.carbs_g,
      fatG: ai.per_serving.fat_g,
      fiberG: ai.per_serving.fiber_g,
      sugarG: ai.per_serving.sugar_g,
      sodiumMg: ai.per_serving.sodium_mg,
      aiConfidenceScore: ai.confidence,
      rawLabelText: rawText,
    });
    setStatus(
      ai.confidence < 0.5
        ? "Low confidence AI estimate saved."
        : "AI nutrition estimate saved.",
    );
  };

  return (
    <Screen>
      <Card style={{ borderRadius: 22, backgroundColor: "#EDF3FB" }}>
        <Card.Content style={{ gap: 8 }}>
          <Text variant="headlineSmall" style={{ fontWeight: "800", color: "#153A5E" }}>
            Nutrition intelligence
          </Text>
          <Text style={{ color: "#5B6F84" }}>
            {expense.data?.name ?? "Loading item..."}
          </Text>
        </Card.Content>
      </Card>

      <Card style={{ borderRadius: 20, backgroundColor: "#F8FAFD" }}>
        <Card.Content style={{ gap: 10 }}>
          <TextInput
            label="Barcode (optional)"
            mode="outlined"
            value={barcode}
            onChangeText={setBarcode}
            keyboardType="number-pad"
            placeholder="Enter UPC/EAN for Open Food Facts lookup"
          />
          <TextInput
            label="Nutrition OCR text"
            mode="outlined"
            multiline
            numberOfLines={9}
            value={rawText}
            onChangeText={setRawText}
            placeholder="Paste Nutrition Facts panel text or ingredients..."
          />
          <Button mode="contained" onPress={analyze} loading={upsert.isPending}>
            Re-analyze
          </Button>
        </Card.Content>
      </Card>

      <Card style={{ borderRadius: 20, backgroundColor: "#F4F8FD" }}>
        <Card.Content style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={18} color="#1F4E82" />
            <Text variant="titleMedium" style={{ fontWeight: "800", color: "#173D62" }}>
              Current saved profile
            </Text>
          </View>

          {nutrition.data ? (
            <>
              <Row label="Calories" value={`${nutrition.data.calories?.toFixed(1) ?? "-"} kcal`} />
              <Row label="Protein" value={`${nutrition.data.proteinG?.toFixed(1) ?? "-"} g`} />
              <Row label="Carbs" value={`${nutrition.data.carbsG?.toFixed(1) ?? "-"} g`} />
              <Row label="Fat" value={`${nutrition.data.fatG?.toFixed(1) ?? "-"} g`} />
              <Row
                label="Confidence"
                value={`${Math.round((nutrition.data.aiConfidenceScore ?? 1) * 100)}%`}
              />
            </>
          ) : (
            <Text style={{ color: "#5F748B" }}>No saved nutrition profile.</Text>
          )}
        </Card.Content>
      </Card>

      <Snackbar visible={Boolean(status)} onDismiss={() => setStatus(undefined)} duration={2200}>
        {status}
      </Snackbar>
    </Screen>
  );
}
