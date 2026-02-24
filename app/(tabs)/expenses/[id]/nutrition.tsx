import { useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Button, Card, Snackbar, Text, TextInput } from "react-native-paper";
import { Screen } from "@/components/layout/screen";
import { useExpense } from "@/hooks/use-expenses";
import { useNutritionProfile, useUpsertNutritionMutation } from "@/hooks/use-nutrition";
import { parseNutritionLabel } from "@/modules/nutrition/label-parser";
import { inferNutritionFromText } from "@/services/ai-nutrition.service";

export default function ItemNutritionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const expense = useExpense(id ?? "");
  const nutrition = useNutritionProfile(id ?? "");
  const upsert = useUpsertNutritionMutation();
  const [rawText, setRawText] = useState("");
  const [status, setStatus] = useState<string>();

  const analyze = async () => {
    const item = expense.data;
    if (!item) return;

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
    setStatus(ai.confidence < 0.5 ? "Low confidence AI estimate saved." : "AI nutrition estimate saved.");
  };

  return (
    <Screen>
      <Text variant="headlineSmall">Nutrition Intelligence</Text>
      <Text style={{ color: "#6B7280" }}>{expense.data?.name ?? "Loading item..."}</Text>

      <Card>
        <Card.Content style={{ gap: 10 }}>
          <TextInput
            label="Nutrition OCR Text"
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

      <Card>
        <Card.Content style={{ gap: 6 }}>
          <Text variant="titleMedium">Current Saved Profile</Text>
          {nutrition.data ? (
            <>
              <Text>Calories: {nutrition.data.calories?.toFixed(1) ?? "-"} kcal</Text>
              <Text>Protein: {nutrition.data.proteinG?.toFixed(1) ?? "-"} g</Text>
              <Text>Carbs: {nutrition.data.carbsG?.toFixed(1) ?? "-"} g</Text>
              <Text>Fat: {nutrition.data.fatG?.toFixed(1) ?? "-"} g</Text>
              <Text>
                Confidence: {Math.round((nutrition.data.aiConfidenceScore ?? 1) * 100)}%
              </Text>
            </>
          ) : (
            <Text style={{ color: "#6B7280" }}>No saved nutrition profile.</Text>
          )}
        </Card.Content>
      </Card>

      <Snackbar visible={Boolean(status)} onDismiss={() => setStatus(undefined)} duration={2200}>
        {status}
      </Snackbar>
    </Screen>
  );
}
