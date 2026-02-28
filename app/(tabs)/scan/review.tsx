import { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import {
  Button,
  Card,
  Chip,
  Divider,
  Menu,
  Snackbar,
  Text,
  TextInput,
} from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Screen } from "@/components/layout/screen";
import { useSaveReceiptMutation } from "@/hooks/use-expenses";
import { useScanStore } from "@/store/scan-store";
import { detectAndTranslate } from "@/modules/translate/translation.service";

/* ─── Small helper components ─── */

function InfoPill(props: { icon: string; text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <MaterialCommunityIcons name={props.icon as never} size={12} color="#5B7A9B" />
      <Text style={{ fontSize: 11, color: "#5B7A9B" }}>{props.text}</Text>
    </View>
  );
}

/* ─── Main screen ─── */

export default function ReceiptReviewScreen() {
  const parsed = useScanStore((s) => s.parsedReceipt);
  const imageUri = useScanStore((s) => s.receiptImageUri);
  const ocrMeta = useScanStore((s) => s.ocrMeta);
  const geminiReceipt = useScanStore((s) => s.geminiReceipt);
  const clearDraft = useScanStore((s) => s.clearDraft);
  const saveMutation = useSaveReceiptMutation();

  const [storeName, setStoreName] = useState(parsed?.storeName ?? "");
  const [currencyMenuOpen, setCurrencyMenuOpen] = useState(false);
  const [currency, setCurrency] = useState(parsed?.currency ?? "EUR");
  const [snackbar, setSnackbar] = useState<string>();
  const [items, setItems] = useState(parsed?.items.map((item) => ({ ...item })) ?? []);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingStore, setEditingStore] = useState(false);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0),
    [items],
  );

  const totalDiscount = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.discount || 0), 0),
    [items],
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

  const meta = parsed.meta;

  const updateItem = (index: number, patch: Partial<(typeof items)[number]>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
  };

  const onTranslateNames = async () => {
    const translated = await Promise.all(
      items.map(async (item) => {
        const result = await detectAndTranslate(item.rawName, "en");
        return { ...item, rawName: result.translatedText };
      }),
    );
    setItems(translated);
  };

  const onSave = async () => {
    await saveMutation.mutateAsync({
      imageUri,
      geminiReceipt,
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
      <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 32 }}>

        {/* ═══ Store Header ═══ */}
        <Card style={{ borderRadius: 16, backgroundColor: "#EDF3FB" }}>
          <Card.Content style={{ gap: 6 }}>
            {editingStore ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <TextInput
                  dense
                  mode="outlined"
                  style={{ flex: 1 }}
                  value={storeName}
                  onChangeText={setStoreName}
                  onBlur={() => setEditingStore(false)}
                  autoFocus
                />
                <Button compact onPress={() => setEditingStore(false)}>Done</Button>
              </View>
            ) : (
              <Pressable onPress={() => setEditingStore(true)} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text variant="titleLarge" style={{ fontWeight: "800", color: "#12395E", flex: 1 }}>
                  {storeName || "Tap to set store name"}
                </Text>
                <MaterialCommunityIcons name="pencil-outline" size={16} color="#7B9BBF" />
              </Pressable>
            )}

            {/* Meta pills */}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 2 }}>
              {meta?.time ? <InfoPill icon="clock-outline" text={meta.time} /> : null}
              {parsed.date ? (
                <InfoPill icon="calendar-outline" text={new Date(parsed.date).toLocaleDateString()} />
              ) : null}
              {meta?.storeAddress ? <InfoPill icon="map-marker-outline" text={meta.storeAddress} /> : null}
              {meta?.receiptNumber ? <InfoPill icon="receipt" text={`#${meta.receiptNumber}`} /> : null}
              {meta?.paymentMethod ? <InfoPill icon="credit-card-outline" text={meta.paymentMethod} /> : null}
              {meta?.memberNumber ? <InfoPill icon="card-account-details-outline" text={meta.memberNumber} /> : null}
            </View>

            <Text style={{ fontSize: 11, color: "#8A9DB4" }}>
              AI confidence: {Math.round((ocrMeta?.effectiveConfidence ?? parsed.confidence) * 100)}%
              {parsed.detectedLanguage ? ` · ${parsed.detectedLanguage.toUpperCase()}` : ""}
            </Text>

            {ocrMeta?.usedDemoFallback ? (
              <View style={{
                borderRadius: 8,
                backgroundColor: "#FFF6E8",
                padding: 8,
                marginTop: 2,
              }}>
                <Text style={{ color: "#8A5A1F", fontSize: 11 }}>
                  Demo mode — add EXPO_PUBLIC_GEMINI_API_KEY for real OCR.
                </Text>
              </View>
            ) : null}
          </Card.Content>
        </Card>

        {/* ═══ Items List ═══ */}
        <Card style={{ borderRadius: 16, backgroundColor: "#fff" }}>
          <Card.Content style={{ gap: 0, paddingHorizontal: 12, paddingVertical: 8 }}>
            {/* Header row */}
            <View style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingBottom: 6,
            }}>
              <Text style={{ fontWeight: "800", color: "#12395E", fontSize: 15 }}>
                Items ({items.length})
              </Text>
              <Button compact mode="text" onPress={onTranslateNames} labelStyle={{ fontSize: 12 }}>
                Translate
              </Button>
            </View>

            {items.map((item, index) => {
              const isEditing = editingIndex === index;

              return (
                <View key={`${item.rawName}-${index}`}>
                  {/* ── Compact item row ── */}
                  <Pressable
                    onPress={() => setEditingIndex(isEditing ? null : index)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 8,
                      gap: 8,
                    }}
                  >
                    <View style={{ flex: 1, gap: 1 }}>
                      <Text style={{ fontWeight: "600", color: "#1D3A56", fontSize: 14 }} numberOfLines={1}>
                        {item.rawName || "Unnamed"}
                      </Text>
                      {/* Subtitle: qty/weight info */}
                      {(item.quantity !== 1 || item.discount) ? (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          {item.quantity !== 1 ? (
                            <Text style={{ fontSize: 11, color: "#7B9BBF" }}>
                              {item.isWeighed
                                ? `${item.quantity} kg × ${item.unitPrice.toFixed(2)}/kg`
                                : `${item.quantity} × ${item.unitPrice.toFixed(2)}`}
                            </Text>
                          ) : null}
                          {item.discount && item.discount > 0 ? (
                            <Text style={{ fontSize: 11, color: "#2E7D32", fontWeight: "600" }}>
                              -{item.discount.toFixed(2)} saved
                            </Text>
                          ) : null}
                        </View>
                      ) : null}
                    </View>

                    <Text style={{ fontWeight: "700", color: "#12395E", fontSize: 14, minWidth: 50, textAlign: "right" }}>
                      {item.totalPrice.toFixed(2)}
                    </Text>

                    <MaterialCommunityIcons
                      name={isEditing ? "chevron-up" : "chevron-down"}
                      size={18}
                      color="#9BB0C7"
                    />
                  </Pressable>

                  {/* ── Expanded edit form ── */}
                  {isEditing ? (
                    <View style={{
                      backgroundColor: "#F5F8FC",
                      borderRadius: 10,
                      padding: 10,
                      gap: 8,
                      marginBottom: 4,
                    }}>
                      <TextInput
                        dense
                        mode="outlined"
                        label="Name"
                        value={item.rawName}
                        onChangeText={(v) => updateItem(index, { rawName: v })}
                      />
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <TextInput
                          dense
                          mode="outlined"
                          style={{ flex: 1 }}
                          label="Qty"
                          keyboardType="decimal-pad"
                          value={String(item.quantity)}
                          onChangeText={(v) => updateItem(index, { quantity: Number(v) || 1 })}
                        />
                        <TextInput
                          dense
                          mode="outlined"
                          style={{ flex: 1 }}
                          label="Unit price"
                          keyboardType="decimal-pad"
                          value={String(item.unitPrice)}
                          onChangeText={(v) => updateItem(index, { unitPrice: Number(v) || 0 })}
                        />
                        <TextInput
                          dense
                          mode="outlined"
                          style={{ flex: 1 }}
                          label="Total"
                          keyboardType="decimal-pad"
                          value={String(item.totalPrice)}
                          onChangeText={(v) => updateItem(index, { totalPrice: Number(v) || 0 })}
                        />
                      </View>
                      <Button
                        compact
                        mode="text"
                        textColor="#C62828"
                        onPress={() => removeItem(index)}
                        icon="delete-outline"
                        labelStyle={{ fontSize: 12 }}
                      >
                        Remove item
                      </Button>
                    </View>
                  ) : null}

                  {index < items.length - 1 ? (
                    <Divider style={{ backgroundColor: "#E8EFF6" }} />
                  ) : null}
                </View>
              );
            })}

            {/* Add item */}
            <Pressable
              onPress={() => {
                setItems((prev) => [
                  ...prev,
                  {
                    rawName: "",
                    quantity: 1,
                    unit: "pcs" as const,
                    unitPrice: 0,
                    totalPrice: 0,
                    confidence: 1,
                    confidenceBand: "high" as const,
                  },
                ]);
                setEditingIndex(items.length);
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                paddingVertical: 10,
                marginTop: 4,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: "#D4E0ED",
                borderStyle: "dashed",
              }}
            >
              <MaterialCommunityIcons name="plus" size={16} color="#4B7BAF" />
              <Text style={{ color: "#4B7BAF", fontWeight: "600", fontSize: 13 }}>Add item</Text>
            </Pressable>
          </Card.Content>
        </Card>

        {/* ═══ Totals ═══ */}
        <Card style={{ borderRadius: 16, backgroundColor: "#F0F6FD" }}>
          <Card.Content style={{ gap: 4, paddingVertical: 10 }}>
            {totalDiscount > 0 ? (
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: "#2E7D32", fontSize: 13 }}>Total savings</Text>
                <Text style={{ color: "#2E7D32", fontWeight: "700", fontSize: 13 }}>
                  -{totalDiscount.toFixed(2)} {currency}
                </Text>
              </View>
            ) : null}
            {parsed.tax > 0 ? (
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: "#5B7A9B", fontSize: 13 }}>Tax</Text>
                <Text style={{ color: "#5B7A9B", fontSize: 13 }}>{parsed.tax.toFixed(2)} {currency}</Text>
              </View>
            ) : null}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontWeight: "800", color: "#12395E", fontSize: 18 }}>Total</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ fontWeight: "800", color: "#12395E", fontSize: 18 }}>
                  {total.toFixed(2)}
                </Text>
                <Menu
                  visible={currencyMenuOpen}
                  onDismiss={() => setCurrencyMenuOpen(false)}
                  anchor={
                    <Chip compact onPress={() => setCurrencyMenuOpen(true)}>{currency}</Chip>
                  }
                >
                  {["EUR", "USD", "GBP", "SEK", "NOK", "DKK", "JPY", "INR"].map((opt) => (
                    <Menu.Item
                      key={opt}
                      onPress={() => { setCurrency(opt); setCurrencyMenuOpen(false); }}
                      title={opt}
                    />
                  ))}
                </Menu>
              </View>
            </View>
            {/* Mismatch warning */}
            {parsed.total > 0 && Math.abs(total - parsed.total) > 0.05 ? (
              <View style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                backgroundColor: "#FFF3E0",
                padding: 6,
                borderRadius: 8,
                marginTop: 2,
              }}>
                <MaterialCommunityIcons name="alert-outline" size={14} color="#E65100" />
                <Text style={{ fontSize: 11, color: "#E65100" }}>
                  Receipt total was {parsed.total.toFixed(2)} — items sum differs by {Math.abs(total - parsed.total).toFixed(2)}
                </Text>
              </View>
            ) : null}
          </Card.Content>
        </Card>

        {/* ═══ Save ═══ */}
        <Button
          mode="contained"
          onPress={onSave}
          loading={saveMutation.isPending}
          style={{ borderRadius: 12 }}
          contentStyle={{ paddingVertical: 4 }}
        >
          Save receipt
        </Button>
      </ScrollView>

      <Snackbar visible={Boolean(snackbar)} onDismiss={() => setSnackbar(undefined)} duration={1700}>
        {snackbar}
      </Snackbar>
    </Screen>
  );
}
