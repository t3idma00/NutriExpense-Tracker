import { useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import {
  Button,
  Card,
  Divider,
  IconButton,
  Menu,
  Snackbar,
  Text,
  TextInput,
} from "react-native-paper";
import { Screen } from "@/components/layout/screen";
import { useSaveReceiptMutation } from "@/hooks/use-expenses";
import { useScanStore } from "@/store/scan-store";
import { detectAndTranslate } from "@/modules/translate/translation.service";

export default function ReceiptReviewScreen() {
  const parsed = useScanStore((s) => s.parsedReceipt);
  const imageUri = useScanStore((s) => s.receiptImageUri);
  const ocrMeta = useScanStore((s) => s.ocrMeta);
  const clearDraft = useScanStore((s) => s.clearDraft);
  const saveMutation = useSaveReceiptMutation();

  const [storeName, setStoreName] = useState(parsed?.storeName ?? "");
  const [currencyMenuOpen, setCurrencyMenuOpen] = useState(false);
  const [currency, setCurrency] = useState(parsed?.currency ?? "USD");
  const [snackbar, setSnackbar] = useState<string>();
  const [showOnlyNeedsReview, setShowOnlyNeedsReview] = useState(false);
  const [items, setItems] = useState(parsed?.items.map((item) => ({ ...item })) ?? []);
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(
      (parsed?.items ?? []).map((item, index) => [
        index,
        (item.confidenceBand ?? "medium") !== "high",
      ]),
    ),
  );

  const total = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0),
    [items],
  );

  const visibleItems = useMemo(
    () =>
      items
        .map((item, index) => ({ item, index }))
        .filter(({ item }) =>
          showOnlyNeedsReview ? (item.confidenceBand ?? "medium") !== "high" : true,
        ),
    [items, showOnlyNeedsReview],
  );

  if (!parsed || !imageUri) {
    return (
      <Screen>
        <Card style={{ borderRadius: 18, backgroundColor: "#F4F8FD" }}>
          <Card.Content style={{ gap: 10 }}>
            <Text variant="titleMedium" style={{ color: "#173D62", fontWeight: "800" }}>
              No parsed receipt found
            </Text>
            <Button mode="contained" onPress={() => router.replace("/(tabs)/scan/receipt")}>
              Back to scanner
            </Button>
          </Card.Content>
        </Card>
      </Screen>
    );
  }

  const updateItem = (index: number, patch: Partial<(typeof items)[number]>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const onTranslateNames = async () => {
    const translated = await Promise.all(
      items.map(async (item) => {
        const result = await detectAndTranslate(item.rawName, "en");
        return {
          ...item,
          rawName: result.translatedText,
        };
      }),
    );
    setItems(translated);
  };

  const onSave = async () => {
    await saveMutation.mutateAsync({
      imageUri,
      parsed: {
        ...parsed,
        storeName,
        currency,
        items,
        total,
        subtotal: total,
      },
    });
    clearDraft();
    setSnackbar("Receipt saved successfully.");
    setTimeout(() => router.replace("/(tabs)/expenses"), 400);
  };

  return (
    <Screen scroll={false}>
      <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 28 }}>
        <Card style={{ borderRadius: 22, backgroundColor: "#EDF3FB" }}>
          <Card.Content style={{ gap: 8 }}>
            <Text variant="headlineSmall" style={{ fontWeight: "800", color: "#153A5E" }}>
              Review receipt
            </Text>
            <Text style={{ color: "#5B6F84" }}>
              Validate low-confidence rows before final save.
            </Text>
          </Card.Content>
        </Card>

        <Card style={{ borderRadius: 20, backgroundColor: "#F8FAFD" }}>
          <Card.Content style={{ gap: 8 }}>
            <TextInput label="Store name" value={storeName} onChangeText={setStoreName} />

            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: "#2D425A" }}>
                Detected language: {parsed.detectedLanguage.toUpperCase()}
              </Text>
              <Button onPress={onTranslateNames}>Translate items</Button>
            </View>

            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: "#2D425A", fontWeight: "700" }}>
                Total: {total.toFixed(2)} {currency}
              </Text>
              <Menu
                visible={currencyMenuOpen}
                onDismiss={() => setCurrencyMenuOpen(false)}
                anchor={<Button onPress={() => setCurrencyMenuOpen(true)}>{currency}</Button>}
              >
                {["USD", "EUR", "GBP", "JPY"].map((option) => (
                  <Menu.Item
                    key={option}
                    onPress={() => {
                      setCurrency(option);
                      setCurrencyMenuOpen(false);
                    }}
                    title={option}
                  />
                ))}
              </Menu>
            </View>

            <Text style={{ color: "#63788F", fontSize: 12 }}>
              OCR confidence {Math.round((ocrMeta?.effectiveConfidence ?? parsed.confidence) * 100)}% | agreement {Math.round((ocrMeta?.agreementScore ?? 0.5) * 100)}%
            </Text>
            {ocrMeta?.usedDemoFallback ? (
              <View
                style={{
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#E7C58A",
                  backgroundColor: "#FFF6E8",
                  padding: 10,
                  gap: 4,
                }}
              >
                <Text style={{ color: "#8A5A1F", fontWeight: "800" }}>
                  Demo OCR fallback is active
                </Text>
                <Text style={{ color: "#7A6648", fontSize: 12 }}>
                  Cloud OCR is disabled, so this receipt uses sample/demo extraction only.
                  Add `EXPO_PUBLIC_GEMINI_API_KEY` in `.env` and restart with `npm run start:clear`.
                </Text>
              </View>
            ) : null}
          </Card.Content>
        </Card>

        <Card style={{ borderRadius: 20, backgroundColor: "#F7FAFF" }}>
          <Card.Content style={{ gap: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text variant="titleMedium" style={{ fontWeight: "800", color: "#173D62" }}>
                Items
              </Text>
              <Button
                compact
                mode={showOnlyNeedsReview ? "contained-tonal" : "text"}
                onPress={() => setShowOnlyNeedsReview((prev) => !prev)}
              >
                {showOnlyNeedsReview ? "Show all" : "Review only"}
              </Button>
            </View>

            <Text style={{ color: "#63788F", fontSize: 12 }}>
              High-confidence items are auto-collapsed.
            </Text>

            {visibleItems.map(({ item, index }) => {
              const band = item.confidenceBand ?? "medium";
              const borderColor = band === "high" ? "#2C9D79" : band === "medium" ? "#8A5A1F" : "#A33F2A";
              const isExpanded = expandedRows[index] ?? true;

              return (
                <View
                  key={`${item.rawName}-${index}`}
                  style={{
                    gap: 6,
                    borderLeftWidth: 4,
                    borderLeftColor: borderColor,
                    paddingLeft: 8,
                    paddingBottom: 6,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: "700", color: "#21364D" }}>
                        {item.rawName || "Unnamed item"}
                      </Text>
                      <Text style={{ color: "#63788F", fontSize: 12 }}>
                        {Math.round((item.confidence ?? 0) * 100)}% confidence ({band})
                      </Text>
                    </View>
                    <Button
                      compact
                      mode="text"
                      onPress={() => setExpandedRows((prev) => ({ ...prev, [index]: !isExpanded }))}
                    >
                      {isExpanded ? "Collapse" : "Edit"}
                    </Button>
                    <IconButton
                      icon="delete-outline"
                      onPress={() => setItems((prev) => prev.filter((_, entryIndex) => entryIndex !== index))}
                    />
                  </View>

                  {isExpanded ? (
                    <>
                      <TextInput
                        style={{ flex: 1 }}
                        label="Item name"
                        value={item.rawName}
                        onChangeText={(value) => updateItem(index, { rawName: value })}
                      />
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <TextInput
                          style={{ flex: 1 }}
                          label="Qty"
                          keyboardType="decimal-pad"
                          value={String(item.quantity)}
                          onChangeText={(value) => updateItem(index, { quantity: Number(value) || 1 })}
                        />
                        <TextInput
                          style={{ flex: 1 }}
                          label="Price"
                          keyboardType="decimal-pad"
                          value={String(item.totalPrice)}
                          onChangeText={(value) => updateItem(index, { totalPrice: Number(value) || 0 })}
                        />
                      </View>
                    </>
                  ) : null}

                  <Divider style={{ marginTop: 4 }} />
                </View>
              );
            })}

            <Button
              mode="outlined"
              onPress={() =>
                setItems((prev) => [
                  ...prev,
                  {
                    rawName: "",
                    quantity: 1,
                    unit: "pcs",
                    unitPrice: 0,
                    totalPrice: 0,
                    confidence: 1,
                    confidenceBand: "high",
                  },
                ])
              }
            >
              Add item manually
            </Button>
          </Card.Content>
        </Card>

        <Button mode="contained" onPress={onSave} loading={saveMutation.isPending}>
          Save receipt
        </Button>
      </ScrollView>

      <Snackbar visible={Boolean(snackbar)} onDismiss={() => setSnackbar(undefined)} duration={1700}>
        {snackbar}
      </Snackbar>
    </Screen>
  );
}
