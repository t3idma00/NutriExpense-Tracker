import { useMemo, useState } from "react";
import { router } from "expo-router";
import { FlatList, Pressable, View } from "react-native";
import dayjs from "dayjs";
import { Button, Card, Chip, Searchbar, Text } from "react-native-paper";
import { Screen } from "@/components/layout/screen";
import { CategoryChip } from "@/components/ui/category-chip";
import { PriceTag } from "@/components/ui/price-tag";
import { EXPENSE_CATEGORIES } from "@/constants/categories";
import { useDeleteExpenseMutation, useExpenseSummary, useExpenses } from "@/hooks/use-expenses";
import { useCurrentUser } from "@/hooks/use-user";
import { useLogConsumptionMutation } from "@/hooks/use-nutrition";
import type { ExpenseRow } from "@/db/repositories/expense-repository";
import { startOfDayUnix } from "@/utils/date";

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
  const deleteMutation = useDeleteExpenseMutation();
  const logConsumption = useLogConsumptionMutation(user?.id ?? "");
  const today = startOfDayUnix();

  const sectioned = useMemo(() => {
    const groups: Record<string, ExpenseRow[]> = {};
    for (const item of expenses.data ?? []) {
      const key = dayjs(item.purchaseDate).format("YYYY-MM-DD");
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    return Object.entries(groups);
  }, [expenses.data]);

  return (
    <Screen>
      <Text variant="headlineSmall">Expense Dashboard</Text>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <Card style={{ flex: 1 }}>
          <Card.Content>
            <Text>Total Spent</Text>
            <PriceTag value={summary.data?.totalSpent ?? 0} />
          </Card.Content>
        </Card>
        <Card style={{ flex: 1 }}>
          <Card.Content>
            <Text>Avg Daily</Text>
            <PriceTag value={summary.data?.avgDaily ?? 0} />
          </Card.Content>
        </Card>
      </View>

      <Searchbar
        placeholder="Search item names"
        value={search}
        onChangeText={setSearch}
        style={{ borderRadius: 16 }}
      />

      <FlatList
        horizontal
        data={[{ key: "all", label: "All" }, ...EXPENSE_CATEGORIES.map((c) => ({ key: c.key, label: c.label }))]}
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
          <Text style={{ color: "#6B7280", fontWeight: "700" }}>{dayjs(date).format("ddd, MMM D")}</Text>
          {entries.map((item) => (
            <Pressable key={item.id} onPress={() => router.push(`/(tabs)/expenses/${item.id}`)}>
              <Card>
                <Card.Content style={{ gap: 8 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <View style={{ gap: 4, flex: 1 }}>
                      <Text style={{ fontWeight: "700" }}>{item.name}</Text>
                      <Text style={{ color: "#6B7280", fontSize: 12 }}>
                        {item.storeName ?? "Store"} | {item.quantity} {item.unit}
                      </Text>
                    </View>
                    <PriceTag value={item.totalPrice} currency={item.currency} />
                  </View>
                  <View style={{ flexDirection: "row", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <CategoryChip category={item.category} />
                    <Button
                      compact
                      mode="text"
                      onPress={() =>
                        logConsumption.mutate({
                          expenseItemId: item.id,
                          logDate: today,
                          consumedServings: 1,
                          calories: 0,
                          proteinG: 0,
                          carbsG: 0,
                          fatG: 0,
                          fiberG: 0,
                          sugarG: 0,
                          sodiumMg: 0,
                        })
                      }
                    >
                      Log Consumption
                    </Button>
                    <Button compact mode="text" onPress={() => deleteMutation.mutate(item.id)}>
                      Delete
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            </Pressable>
          ))}
        </View>
      ))}

      {!sectioned.length ? (
        <Card>
          <Card.Content>
            <Text style={{ color: "#6B7280" }}>
              No expenses found. Scan a receipt to get started.
            </Text>
          </Card.Content>
        </Card>
      ) : null}
    </Screen>
  );
}

