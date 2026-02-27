import { useMemo, useState } from "react";
import { View } from "react-native";
import { Button, Card, Menu, Snackbar, Text, TextInput } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Screen } from "@/components/layout/screen";
import { useExpenses } from "@/hooks/use-expenses";
import { useUpsertNutritionMutation } from "@/hooks/use-nutrition";
import { parseNutritionLabel } from "@/modules/nutrition/label-parser";
import {
  lookupNutritionByBarcode,
  resolveBarcodeFromInput,
} from "@/services/barcode-nutrition.service";
import { inferNutritionFromText } from "@/services/ai-nutrition.service";

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

    const resolvedBarcode = await resolveBarcodeFromInput({
      barcodeRaw: barcode,
      rawText: rawLabelText,
    });

    if (resolvedBarcode) {
      const barcodeProfile = await lookupNutritionByBarcode(resolvedBarcode);
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
        setStatus(
          barcode.trim()
            ? "Saved nutrition profile from barcode database."
            : `Barcode detected from label text (${resolvedBarcode}). Saved from barcode database.`,
        );
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
      <Card style={{ borderRadius: 22, backgroundColor: "#EDF3FB" }}>
        <Card.Content style={{ gap: 8 }}>
          <Text variant="headlineSmall" style={{ fontWeight: "800", color: "#153A5E" }}>
            Nutrition label parser
          </Text>
          <Text style={{ color: "#5B6F84" }}>
            Select an expense item, paste nutrition text, and parse or infer nutrient values.
          </Text>
        </Card.Content>
      </Card>

      <Card style={{ borderRadius: 20, backgroundColor: "#F8FAFD" }}>
        <Card.Content style={{ gap: 10 }}>
          <Text variant="titleMedium" style={{ fontWeight: "800", color: "#173D62" }}>
            Target item
          </Text>
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
                title={`${item.name} - ${item.storeName ?? "Store"}`}
              />
            ))}
          </Menu>

          <TextInput
            mode="outlined"
            label="Barcode (optional)"
            value={barcode}
            onChangeText={setBarcode}
            keyboardType="number-pad"
            placeholder="Enter UPC/EAN for Open Food Facts lookup"
          />

          <TextInput
            mode="outlined"
            multiline
            numberOfLines={10}
            label="Nutrition facts OCR text"
            value={rawLabelText}
            onChangeText={setRawLabelText}
            placeholder="Paste Nutrition Facts panel text..."
          />

          <Button mode="contained" onPress={onAnalyze} loading={upsertNutrition.isPending}>
            Analyze and save
          </Button>
        </Card.Content>
      </Card>

      <Card style={{ borderRadius: 20, backgroundColor: "#F4F8FD" }}>
        <Card.Content style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <MaterialCommunityIcons name="lightbulb-on-outline" size={17} color="#1F4E82" />
            <Text variant="titleSmall" style={{ fontWeight: "800", color: "#173D62" }}>
              Tips
            </Text>
          </View>
          <Text style={{ color: "#60748C" }}>
            Include lines like Serving Size, Calories, Total Fat, Carbohydrate, Protein, Sodium.
          </Text>
        </Card.Content>
      </Card>

      <Snackbar visible={Boolean(status)} onDismiss={() => setStatus(undefined)} duration={2200}>
        {status}
      </Snackbar>
    </Screen>
  );
}
