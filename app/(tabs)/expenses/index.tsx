import { useMemo, useState } from "react";
import { router } from "expo-router";
import { FlatList, Pressable, View } from "react-native";
import dayjs from "dayjs";
import { Button, Card, Chip, Searchbar, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Screen } from "@/components/layout/screen";
import { CategoryChip } from "@/components/ui/category-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { PriceTag } from "@/components/ui/price-tag";
import { EXPENSE_CATEGORIES, getCategoryMeta } from "@/constants/categories";
import { useLatestAnalyticsSnapshot } from "@/hooks/use-analytics";
import { useDeleteExpenseMutation, useExpenseSummary, useExpenses } from "@/hooks/use-expenses";
import { useLogConsumptionMutation } from "@/hooks/use-nutrition";
import { useCurrentUser } from "@/hooks/use-user";
import type { ExpenseRow } from "@/db/repositories/expense-repository";
import { formatCurrency } from "@/utils/currency";
import { startOfDayUnix } from "@/utils/date";

function clampAccuracy(value: number) {
  if (!Number.isFinite(value)) return 82;
  return Math.max(35, Math.min(99, Math.round(value * 100)));
}

function expiryHint(expiryDate?: number) {
  if (!expiryDate) return "stable";
  const diff = dayjs(expiryDate).startOf("day").diff(dayjs().startOf("day"), "day");
  if (diff <= 0) return "expires today";
  if (diff === 1) return "expires tomorrow";
  if (diff <= 3) return `expires in ${diff} days`;
  return "stable";
}

function quantityBadge(quantity: number, unit: string) {
  const safe = Number.isInteger(quantity) ? `${quantity}` : quantity.toFixed(1);
  return `${safe}${unit}`;
}

export default function ExpensesScreen() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>();
  const { data: user } = useCurrentUser();
  const from = dayjs().startOf("month").valueOf();
  const to = Date.now();

  const expenses = useExpenses({
    search: search.trim() || undefined,
    category: (category as never) || undefined,
    from,
    to,
    limit: 200,
  });
  const summary = useExpenseSummary(from, to);
  const analytics = useLatestAnalyticsSnapshot();
  const deleteMutation = useDeleteExpenseMutation();
  const logConsumption = useLogConsumptionMutation(user?.id ?? "");
  const today = startOfDayUnix();

  const sorted = useMemo(
    () => [...(expenses.data ?? [])].sort((a, b) => b.purchaseDate - a.purchaseDate),
    [expenses.data],
  );

  const sectioned = useMemo(() => {
    const groups: Record<string, ExpenseRow[]> = {};
    for (const item of sorted) {
      const key = dayjs(item.purchaseDate).format("YYYY-MM-DD");
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    return Object.entries(groups);
  }, [sorted]);

  const featured = sorted.slice(0, 6);
  const accuracy = clampAccuracy(analytics.data?.reliabilityScore ?? 0);

  const expiringItems = sorted.filter((item) => {
    if (!item.expiryDate) return false;
    const diff = dayjs(item.expiryDate).startOf("day").diff(dayjs().startOf("day"), "day");
    return diff <= 1;
  });

  const ironMention = (analytics.data?.metrics ?? []).find((metric) => metric.key === "proteinG");
  const healthSignal = Math.max(35, Math.min(96, Math.round((ironMention?.recentAvg ?? 0) * 8)));

  return (
    <Screen>
      <View
        style={{
          borderRadius: 22,
          borderWidth: 1,
          borderColor: "#D6DEE9",
          backgroundColor: "#F3F6FA",
          padding: 12,
          gap: 10,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text variant="titleLarge" style={{ fontWeight: "800", color: "#13395E", flex: 1 }}>
            Friday shop - smart list
          </Text>
          <View
            style={{
              borderRadius: 999,
              backgroundColor: "#DFEAF8",
              paddingHorizontal: 12,
              paddingVertical: 6,
            }}
          >
            <Text style={{ color: "#1F4E82", fontWeight: "700", fontSize: 12 }}>{`>${accuracy}% accuracy`}</Text>
          </View>
        </View>

        {featured.map((item) => {
          const meta = getCategoryMeta(item.category);
          return (
            <Pressable key={item.id} onPress={() => router.push(`/(tabs)/expenses/${item.id}`)}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  borderBottomWidth: 1,
                  borderColor: "#E5EAF1",
                  paddingBottom: 8,
                }}
              >
                <MaterialCommunityIcons name={meta.icon as never} size={16} color={meta.color} />
                <Text style={{ flex: 1, fontWeight: "700", color: "#13395E" }} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={{ color: "#62748A", fontSize: 12 }} numberOfLines={1}>
                  {expiryHint(item.expiryDate)}
                </Text>
                <View
                  style={{
                    borderRadius: 999,
                    backgroundColor: "#DDEBFA",
                    paddingHorizontal: 9,
                    paddingVertical: 4,
                    minWidth: 52,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "#1F4E82", fontSize: 12, fontWeight: "700" }}>
                    {quantityBadge(item.quantity, item.unit)}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })}

        <View
          style={{
            borderRadius: 16,
            backgroundColor: "#E8EFE8",
            paddingHorizontal: 12,
            paddingVertical: 10,
            flexDirection: "row",
            gap: 8,
            alignItems: "center",
          }}
        >
          <MaterialCommunityIcons name="check-circle" size={16} color="#2E7D59" />
          <Text style={{ flex: 1, color: "#1D3C2F" }}>
            Post-shop learning: items not bought improve next list
          </Text>
        </View>
      </View>

      <Card style={{ borderRadius: 20, backgroundColor: "#EAF2FA" }}>
        <Card.Content
          style={{
            gap: 10,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View
            style={{
              width: 62,
              height: 62,
              borderRadius: 31,
              borderWidth: 8,
              borderColor: "#2E85C9",
              borderTopColor: "#C9DFF4",
              borderRightColor: "#C9DFF4",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#F7FBFF",
            }}
          >
            <Text style={{ fontWeight: "800", color: "#165286" }}>{healthSignal}%</Text>
          </View>

          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="titleMedium" style={{ fontWeight: "700", color: "#103A63" }}>
              Family health signal
            </Text>
            <Text style={{ color: "#4E6074" }}>
              Low alert checks are active and the smart list adjusts for nutrient gaps.
            </Text>
          </View>

          <MaterialCommunityIcons name="bell-ring-outline" size={18} color="#C26C2B" />
        </Card.Content>
      </Card>

      <View style={{ gap: 10 }}>
        <Text variant="titleMedium" style={{ fontWeight: "800", color: "#1A3048" }}>
          Meals & school (auto-track)
        </Text>
        <Button mode="contained" onPress={() => router.push("/(tabs)/scan/receipt")}>
          scan first receipt {"->"}
        </Button>
      </View>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <View
          style={{
            flex: 1,
            borderRadius: 16,
            backgroundColor: "#F2ECDC",
            padding: 12,
            gap: 4,
          }}
        >
          <Text style={{ color: "#8E611E", fontWeight: "700" }}>Expires soon</Text>
          <Text style={{ color: "#1D2B3A", fontWeight: "700" }} numberOfLines={2}>
            {expiringItems.length
              ? expiringItems.slice(0, 2).map((item) => item.name).join(", ")
              : "No urgent expiry items"}
          </Text>
        </View>

        <View
          style={{
            flex: 1,
            borderRadius: 16,
            backgroundColor: "#DCE7F6",
            padding: 12,
            gap: 4,
          }}
        >
          <Text style={{ color: "#1F4E82", fontWeight: "700" }}>7pm reminder</Text>
          <Text style={{ color: "#27394E" }}>Check tomorrow list and nutrition gaps</Text>
        </View>
      </View>

      <Card style={{ borderRadius: 20, backgroundColor: "#F6F8FC" }}>
        <Card.Content style={{ gap: 10 }}>
          <Text variant="titleMedium" style={{ fontWeight: "800", color: "#16385A" }}>
            Receipt ledger
          </Text>

          <Searchbar
            placeholder="Search item names"
            value={search}
            onChangeText={setSearch}
            style={{ borderRadius: 16, backgroundColor: "#FFFFFF" }}
          />

          <FlatList
            horizontal
            data={[
              { key: "all", label: "All" },
              ...EXPENSE_CATEGORIES.map((entry) => ({ key: entry.key, label: entry.label })),
            ]}
            keyExtractor={(item) => item.key}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
            renderItem={({ item }) => (
              <Chip
                selected={category === item.key || (!category && item.key === "all")}
                onPress={() => setCategory(item.key === "all" ? undefined : item.key)}
              >
                {item.label}
              </Chip>
            )}
          />

          {sectioned.map(([date, entries]) => (
            <View key={date} style={{ gap: 8 }}>
              <Text style={{ color: "#60748C", fontWeight: "700" }}>{dayjs(date).format("ddd, MMM D")}</Text>
              {entries.map((item) => (
                <Pressable key={item.id} onPress={() => router.push(`/(tabs)/expenses/${item.id}`)}>
                  <View
                    style={{
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: "#E0E6EF",
                      backgroundColor: "#FFFFFF",
                      padding: 10,
                      gap: 8,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <View style={{ gap: 4, flex: 1 }}>
                        <Text style={{ fontWeight: "700" }}>{item.name}</Text>
                        <Text style={{ color: "#60748C", fontSize: 12 }}>
                          {item.storeName ?? "Store"} | {item.quantity} {item.unit}
                        </Text>
                      </View>
                      <PriceTag value={item.totalPrice} currency={item.currency} />
                    </View>

                    <View
                      style={{
                        flexDirection: "row",
                        gap: 8,
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <CategoryChip category={item.category} />
                      <Button
                        compact
                        mode="text"
                        onPress={() =>
                          logConsumption.mutate({
                            expenseItemId: item.id,
                            logDate: today,
                            consumedServings: 1,
                          })
                        }
                      >
                        Log 1 Serving
                      </Button>
                      <Button compact mode="text" onPress={() => deleteMutation.mutate(item.id)}>
                        Delete
                      </Button>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          ))}

          {!sectioned.length ? (
            <EmptyState
              icon="basket-outline"
              title="No expenses found"
              description="Capture one receipt to unlock categorized spending and food intelligence."
              actionLabel="Scan Your First Receipt"
              onAction={() => router.push("/(tabs)/scan/receipt")}
              previewLines={[
                "Organic Bananas  x2      $3.50",
                "Greek Yogurt      x1      $4.99",
                "Chicken Breast    x1      $12.49",
              ]}
            />
          ) : null}
        </Card.Content>
      </Card>

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ color: "#5F7084" }}>
          Month total {formatCurrency(summary.data?.totalSpent ?? 0, "USD", "en-US")}
        </Text>
        <Button compact onPress={() => router.push("/(tabs)/expenses/analytics")}>
          Open analytics
        </Button>
      </View>
    </Screen>
  );
}
