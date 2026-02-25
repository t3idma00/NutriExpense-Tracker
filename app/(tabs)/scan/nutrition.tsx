import { useMemo, useState } from "react";
import { View } from "react-native";
import { Button, Card, Menu, Snackbar, Text, TextInput } from "react-native-paper";
import { Screen } from "@/components/layout/screen";
import { useExpenses } from "@/hooks/use-expenses";
import { useUpsertNutritionMutation } from "@/hooks/use-nutrition";
import { parseNutritionLabel } from "@/modules/nutrition/label-parser";
import { inferNutritionFromText } from "@/services/ai-nutrition.service";
import { lookupNutritionByBarcode } from "@/services/barcode-nutrition.service";

export default function NutritionScanScreen() {
  const expenseItems = useExpenses({ limit: 50 });
  const upsertNutrition = useUpsertNutritionMutation();

  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [rawLabelText, setRawLabelText] = useState("");
  const [barcode, setBarcode] = useState("");
  const [menuVisible, setMenuVisible] = useState(false);
  const [status, setStatus] = useState<string>();

  const selectedItem = useMemo(
    () => (expenseItems.data ?? []).find((item) => item.id === selectedItemId),
    [expenseItems.data, selectedItemId],
  );

  const onAnalyze = async () => {
    if (!selectedItemId || !selectedItem) {
      setStatus("Select an item first.");
      return;
    }

    if (barcode.trim()) {
      const barcodeProfile = await lookupNutritionByBarcode(barcode);
      if (barcodeProfile) {
        await upsertNutrition.mutateAsync({
          expenseItemId: selectedItemId,
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
          rawLabelText: rawLabelText || `Barcode: ${barcodeProfile.barcode}`,
        });
        setStatus("Saved nutrition profile from barcode database.");
        return;
      }
    }

    const parsed = parseNutritionLabel(rawLabelText);
    if (parsed.confidence >= 0.75) {
      await upsertNutrition.mutateAsync({
        expenseItemId: selectedItemId,
        source: "label_scan",
        rawLabelText,
        aiConfidenceScore: parsed.confidence,
        ...parsed.values,
      });
      setStatus("Saved nutrition profile from label.");
      return;
    }

    const ai = await inferNutritionFromText({
      name: selectedItem.name,
      category: selectedItem.category,
      rawOcrText: rawLabelText,
    });

    await upsertNutrition.mutateAsync({
      expenseItemId: selectedItemId,
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
      rawLabelText,
    });
    setStatus(
      ai.confidence < 0.5
        ? "Saved with low-confidence AI estimate."
        : "Saved nutrition profile using AI estimate.",
    );
  };

  return (
    <Screen>
      <Text variant="headlineSmall">Nutrition Label Parser</Text>
      <Text style={{ color: "#6B7280" }}>
        Select an expense item, paste nutrition text, and SmartSpendAI parses or infers nutrients.
      </Text>

      <Card>
        <Card.Content style={{ gap: 10 }}>
          <Text variant="titleMedium">Target Item</Text>
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <Button mode="outlined" onPress={() => setMenuVisible(true)}>
                {selectedItem?.name ?? "Select expense item"}
              </Button>
            }
          >
            {(expenseItems.data ?? []).map((item) => (
              <Menu.Item
                key={item.id}
                onPress={() => {
                  setSelectedItemId(item.id);
                  setMenuVisible(false);
                }}
                title={`${item.name} • ${item.storeName ?? "Store"}`}
              />
            ))}
          </Menu>

          <TextInput
            mode="outlined"
            label="Barcode (Optional)"
            value={barcode}
            onChangeText={setBarcode}
            keyboardType="number-pad"
            placeholder="Enter UPC/EAN for Open Food Facts lookup"
          />

          <TextInput
            mode="outlined"
            multiline
            numberOfLines={10}
            label="Nutrition Facts OCR Text"
            value={rawLabelText}
            onChangeText={setRawLabelText}
            placeholder="Paste Nutrition Facts panel text..."
          />

          <Button mode="contained" onPress={onAnalyze} loading={upsertNutrition.isPending}>
            Analyze and Save
          </Button>
        </Card.Content>
      </Card>

      <View style={{ gap: 8 }}>
        <Text variant="titleSmall">Tips</Text>
        <Text style={{ color: "#6B7280" }}>
          Include lines like Serving Size, Calories, Total Fat, Carbohydrate, Protein, Sodium.
        </Text>
      </View>

      <Snackbar visible={Boolean(status)} onDismiss={() => setStatus(undefined)} duration={2200}>
        {status}
      </Snackbar>
    </Screen>
  );
}
