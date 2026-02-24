import { View } from "react-native";
import dayjs from "dayjs";
import { Card, ProgressBar, Text } from "react-native-paper";
import { Screen } from "@/components/layout/screen";
import { useCategorySpend, useExpenseSummary } from "@/hooks/use-expenses";

export default function ExpenseAnalyticsScreen() {
  const from = dayjs().startOf("month").valueOf();
  const to = Date.now();
  const summary = useExpenseSummary(from, to);
  const categories = useCategorySpend(from, to);
  const total = summary.data?.totalSpent ?? 0;

  return (
    <Screen>
      <Text variant="headlineSmall">Category Analytics</Text>
      <Card>
        <Card.Content style={{ gap: 6 }}>
          <Text>Month Total</Text>
          <Text variant="headlineMedium">${total.toFixed(2)}</Text>
        </Card.Content>
      </Card>
      <Card>
        <Card.Content style={{ gap: 12 }}>
          <Text variant="titleMedium">Spend Share by Category</Text>
          {(categories.data ?? []).map((entry) => {
            const ratio = total > 0 ? entry.total / total : 0;
            return (
              <View key={entry.category} style={{ gap: 4 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text>{entry.category}</Text>
                  <Text>{(ratio * 100).toFixed(1)}%</Text>
                </View>
                <ProgressBar progress={ratio} />
              </View>
            );
          })}
          {!categories.data?.length ? <Text style={{ color: "#6B7280" }}>No analytics yet.</Text> : null}
        </Card.Content>
      </Card>
    </Screen>
  );
}
