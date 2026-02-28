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

  // Receipt total validation
  const receiptTotal = parsed?.total ?? 0;
  const difference = Math.abs(total - receiptTotal);
  const tolerance = Math.max(0.50, receiptTotal * 0.01);
  const hasReceiptTotal = receiptTotal > 0;
  const isMatch = hasReceiptTotal && difference <= tolerance;
  const isMismatch = hasReceiptTotal && difference > tolerance;
  const diffPercent = receiptTotal > 0 ? (difference / receiptTotal) * 100 : 0;
  const itemsMissing = total < receiptTotal; // items sum less than receipt = missing items

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

            {/* Items sum */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontWeight: "700", color: "#12395E", fontSize: 15 }}>Items total</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ fontWeight: "700", color: "#12395E", fontSize: 15 }}>
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

            {/* Receipt printed total */}
            {hasReceiptTotal ? (
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: "#5B7A9B", fontSize: 13 }}>Receipt total</Text>
                <Text style={{ color: "#5B7A9B", fontSize: 13 }}>
                  {receiptTotal.toFixed(2)} {currency}
                </Text>
              </View>
            ) : null}
          </Card.Content>
        </Card>

        {/* ═══ Validation Card ═══ */}
        {hasReceiptTotal ? (
          isMatch ? (
            /* ── Match ── */
            <Card style={{ borderRadius: 16, backgroundColor: "#E8F5E9" }}>
              <Card.Content style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12 }}>
                <MaterialCommunityIcons name="check-circle" size={28} color="#2E7D32" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "800", color: "#1B5E20", fontSize: 14 }}>
                    All items accounted for!
                  </Text>
                  <Text style={{ color: "#388E3C", fontSize: 12 }}>
                    Receipt total matches perfectly
                  </Text>
                </View>
              </Card.Content>
            </Card>
          ) : (
            /* ── Mismatch ── */
            <Card style={{
              borderRadius: 16,
              backgroundColor: diffPercent > 20 ? "#FBE9E7" : diffPercent > 5 ? "#FFF3E0" : "#FFF8E1",
              borderWidth: 1,
              borderColor: diffPercent > 20 ? "#FFAB91" : diffPercent > 5 ? "#FFE0B2" : "#FFF9C4",
            }}>
              <Card.Content style={{ gap: 10, paddingVertical: 12 }}>
                {/* Header */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <MaterialCommunityIcons
                    name={diffPercent > 20 ? "alert-circle-outline" : diffPercent > 5 ? "magnify-scan" : "information-outline"}
                    size={28}
                    color={diffPercent > 20 ? "#D84315" : diffPercent > 5 ? "#E65100" : "#F9A825"}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontWeight: "800",
                      fontSize: 14,
                      color: diffPercent > 20 ? "#BF360C" : diffPercent > 5 ? "#E65100" : "#F57F17",
                    }}>
                      {diffPercent > 20
                        ? "Looks like we missed a few things!"
                        : diffPercent > 5
                          ? "Some items might be hiding!"
                          : "Almost there!"}
                    </Text>
                    <Text style={{
                      fontSize: 12,
                      color: diffPercent > 20 ? "#D84315" : diffPercent > 5 ? "#EF6C00" : "#F9A825",
                    }}>
                      {diffPercent > 20
                        ? `${difference.toFixed(2)} ${currency} worth of items not captured`
                        : diffPercent > 5
                          ? `${difference.toFixed(2)} ${currency} unaccounted for`
                          : `Tiny difference of ${difference.toFixed(2)} ${currency} — likely rounding or a small fee`}
                    </Text>
                  </View>
                </View>

                {/* Side-by-side comparison */}
                <View style={{
                  flexDirection: "row",
                  backgroundColor: "rgba(255,255,255,0.7)",
                  borderRadius: 10,
                  padding: 10,
                  gap: 8,
                }}>
                  <View style={{ flex: 1, alignItems: "center", gap: 2 }}>
                    <Text style={{ fontSize: 11, color: "#5B7A9B" }}>Receipt says</Text>
                    <Text style={{ fontWeight: "800", fontSize: 17, color: "#12395E" }}>
                      {receiptTotal.toFixed(2)}
                    </Text>
                  </View>
                  <View style={{ justifyContent: "center" }}>
                    <MaterialCommunityIcons name="arrow-right" size={18} color="#9BB0C7" />
                  </View>
                  <View style={{ flex: 1, alignItems: "center", gap: 2 }}>
                    <Text style={{ fontSize: 11, color: "#5B7A9B" }}>Items sum</Text>
                    <Text style={{ fontWeight: "800", fontSize: 17, color: isMismatch ? "#D84315" : "#12395E" }}>
                      {total.toFixed(2)}
                    </Text>
                  </View>
                  <View style={{ justifyContent: "center" }}>
                    <MaterialCommunityIcons name="equal" size={18} color="#9BB0C7" />
                  </View>
                  <View style={{ flex: 1, alignItems: "center", gap: 2 }}>
                    <Text style={{ fontSize: 11, color: "#5B7A9B" }}>
                      {itemsMissing ? "Missing" : "Extra"}
                    </Text>
                    <Text style={{
                      fontWeight: "800",
                      fontSize: 17,
                      color: diffPercent > 20 ? "#D84315" : "#E65100",
                    }}>
                      {itemsMissing ? "+" : "-"}{difference.toFixed(2)}
                    </Text>
                  </View>
                </View>

                {/* Action buttons */}
                <View style={{ flexDirection: "row", gap: 8, marginTop: 2 }}>
                  <Button
                    mode="contained"
                    icon="camera-retake"
                    onPress={() => {
                      clearDraft();
                      router.replace("/(tabs)/scan/receipt");
                    }}
                    style={{
                      flex: 1,
                      borderRadius: 10,
                      backgroundColor: diffPercent > 20 ? "#E65100" : "#F57C00",
                    }}
                    labelStyle={{ fontSize: 13, fontWeight: "700" }}
                  >
                    Scan Again
                  </Button>
                  <Button
                    mode="text"
                    onPress={onSave}
                    loading={saveMutation.isPending}
                    style={{ flex: 1, borderRadius: 10 }}
                    textColor="#8D6E63"
                    labelStyle={{ fontSize: 13 }}
                  >
                    Save Anyway
                  </Button>
                </View>
              </Card.Content>
            </Card>
          )
        ) : null}

        {/* ═══ Save ═══ */}
        <Button
          mode="contained"
          onPress={onSave}
          loading={saveMutation.isPending}
          style={{
            borderRadius: 12,
            backgroundColor: isMismatch ? "#B0BEC5" : undefined,
          }}
          contentStyle={{ paddingVertical: 4 }}
        >
          {isMismatch ? "Save Anyway" : "Save receipt"}
        </Button>
      </ScrollView>

      <Snackbar visible={Boolean(snackbar)} onDismiss={() => setSnackbar(undefined)} duration={1700}>
        {snackbar}
      </Snackbar>
    </Screen>
  );
}
