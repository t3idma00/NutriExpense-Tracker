import { useMemo, useState } from "react";
import { router } from "expo-router";
import { ScrollView, View } from "react-native";
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
  const [items, setItems] = useState(
    parsed?.items.map((item) => ({ ...item })) ?? [],
  );
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
      items.filter((item) =>
        showOnlyNeedsReview ? (item.confidenceBand ?? "medium") !== "high" : true,
      ),
    [items, showOnlyNeedsReview],
  );

  if (!parsed || !imageUri) {
    return (
      <Screen>
        <Text variant="titleMedium">No parsed receipt found.</Text>
        <Button mode="contained" onPress={() => router.replace("/(tabs)/scan/receipt")}>
          Back to Scanner
        </Button>
      </Screen>
    );
  }

  const updateItem = (
    index: number,
    patch: Partial<(typeof items)[number]>,
  ) => {
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
        <Text variant="headlineSmall">Review Receipt</Text>
        <Card>
          <Card.Content style={{ gap: 8 }}>
            <TextInput label="Store Name" value={storeName} onChangeText={setStoreName} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text>Detected Language: {parsed.detectedLanguage.toUpperCase()}</Text>
              <Button onPress={onTranslateNames}>Translate Items</Button>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text>Total: {total.toFixed(2)} {currency}</Text>
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
            <Text style={{ color: "#6B7280", fontSize: 12 }}>
              OCR confidence {Math.round((ocrMeta?.effectiveConfidence ?? parsed.confidence) * 100)}%
              {" "}
              | agreement {Math.round((ocrMeta?.agreementScore ?? 0.5) * 100)}%
            </Text>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content style={{ gap: 8 }}>
            <Text variant="titleMedium">Items</Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: "#6B7280", fontSize: 12 }}>
                High confidence items are auto-collapsed.
              </Text>
              <Button compact mode={showOnlyNeedsReview ? "contained-tonal" : "text"} onPress={() => setShowOnlyNeedsReview((prev) => !prev)}>
                {showOnlyNeedsReview ? "Show All" : "Review Only"}
              </Button>
            </View>
            {visibleItems.map((item) => {
              const index = items.findIndex((entry) => entry === item);
              const band = item.confidenceBand ?? "medium";
              const borderColor =
                band === "high" ? "#10B981" : band === "medium" ? "#D97706" : "#DC2626";
              const isExpanded = expandedRows[index] ?? true;

              return (
                <View
                  key={`${item.rawName}-${index}`}
                  style={{ gap: 6, borderLeftWidth: 4, borderLeftColor: borderColor, paddingLeft: 8 }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: "700" }}>{item.rawName || "Unnamed item"}</Text>
                      <Text style={{ color: "#6B7280", fontSize: 12 }}>
                        {Math.round((item.confidence ?? 0) * 100)}% confidence ({band})
                      </Text>
                    </View>
                    <Button compact mode="text" onPress={() => setExpandedRows((prev) => ({ ...prev, [index]: !isExpanded }))}>
                      {isExpanded ? "Collapse" : "Edit"}
                    </Button>
                    <IconButton
                      icon="delete-outline"
                      onPress={() =>
                        setItems((prev) => prev.filter((_, entryIndex) => entryIndex !== index))
                      }
                    />
                  </View>
                  {isExpanded ? (
                    <>
                      <TextInput
                        style={{ flex: 1 }}
                        label="Item Name"
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
                  <Divider />
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
              Add Item Manually
            </Button>
          </Card.Content>
        </Card>

        <Button mode="contained" onPress={onSave} loading={saveMutation.isPending}>
          Save Receipt
        </Button>
      </ScrollView>
      <Snackbar visible={Boolean(snackbar)} onDismiss={() => setSnackbar(undefined)} duration={1700}>
        {snackbar}
      </Snackbar>
    </Screen>
  );
}
