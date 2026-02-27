import { View } from "react-native";
import dayjs from "dayjs";
import { Card, ProgressBar, Text } from "react-native-paper";
import { Screen } from "@/components/layout/screen";
import { EmptyState } from "@/components/ui/empty-state";
import { useCategorySpend, useExpenseSummary } from "@/hooks/use-expenses";
import { formatCurrency } from "@/utils/currency";

function barColor(ratio: number) {
  if (ratio >= 0.35) return "#1F4E82";
  if (ratio >= 0.18) return "#2C9D79";
  return "#6A86A5";
}

export default function ExpenseAnalyticsScreen() {
  const from = dayjs().startOf("month").valueOf();
  const to = Date.now();
  const summary = useExpenseSummary(from, to);
  const categories = useCategorySpend(from, to);
  const total = summary.data?.totalSpent ?? 0;
  const avgDaily = summary.data?.avgDaily ?? 0;
  const itemsCount = summary.data?.itemsCount ?? 0;

  return (
    <Screen>
      <Card style={{ borderRadius: 22, backgroundColor: "#EDF3FB" }}>
        <Card.Content style={{ gap: 8 }}>
          <Text variant="headlineSmall" style={{ fontWeight: "800", color: "#153A5E" }}>
            Category analytics
          </Text>
          <Text style={{ color: "#5B6F84" }}>
            Distribution and concentration of monthly spending by category.
          </Text>
        </Card.Content>
      </Card>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <Card style={{ flex: 1, borderRadius: 18, backgroundColor: "#F6F9FE" }}>
          <Card.Content style={{ gap: 6 }}>
            <Text style={{ color: "#5C6E84", fontSize: 12 }}>Month total</Text>
            <Text variant="headlineMedium" style={{ fontWeight: "800", color: "#1F4E82" }}>
              {formatCurrency(total, "USD", "en-US")}
            </Text>
          </Card.Content>
        </Card>

        <Card style={{ flex: 1, borderRadius: 18, backgroundColor: "#F6F9FE" }}>
          <Card.Content style={{ gap: 6 }}>
            <Text style={{ color: "#5C6E84", fontSize: 12 }}>Avg daily</Text>
            <Text variant="headlineMedium" style={{ fontWeight: "800", color: "#1F4E82" }}>
              {formatCurrency(avgDaily, "USD", "en-US")}
            </Text>
            <Text style={{ color: "#5C6E84", fontSize: 12 }}>{itemsCount} items logged</Text>
          </Card.Content>
        </Card>
      </View>

      <Card style={{ borderRadius: 20, backgroundColor: "#F8FAFD" }}>
        <Card.Content style={{ gap: 12 }}>
          <Text variant="titleMedium" style={{ fontWeight: "800", color: "#173D62" }}>
            Spend share by category
          </Text>
          {(categories.data ?? []).map((entry) => {
            const ratio = total > 0 ? entry.total / total : 0;
            return (
              <View key={entry.category} style={{ gap: 6 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: "#24384F", textTransform: "capitalize" }}>
                    {entry.category.replace("_", " ")}
                  </Text>
                  <Text style={{ color: "#526A82", fontWeight: "700" }}>
                    {(ratio * 100).toFixed(1)}%
                  </Text>
                </View>
                <ProgressBar
                  progress={ratio}
                  color={barColor(ratio)}
                  style={{ height: 8, borderRadius: 999, backgroundColor: "#DEE8F4" }}
                />
                <Text style={{ color: "#6A7F96", fontSize: 12 }}>
                  {formatCurrency(entry.total, "USD", "en-US")}
                </Text>
              </View>
            );
          })}
          {!categories.data?.length ? (
            <EmptyState
              icon="chart-donut"
              title="No analytics yet"
              description="Capture receipts to build category-level spend analysis."
            />
          ) : null}
        </Card.Content>
      </Card>
    </Screen>
  );
}
