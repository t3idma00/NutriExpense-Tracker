import { router } from "expo-router";
import { View } from "react-native";
import dayjs from "dayjs";
import { Button, Card, Text } from "react-native-paper";
import { Screen } from "@/components/layout/screen";
import { PriceTag } from "@/components/ui/price-tag";
import { useCurrentUser } from "@/hooks/use-user";
import { useExpenseSummary, useExpenses } from "@/hooks/use-expenses";
import { useAlerts } from "@/hooks/use-alerts";
import { useNutritionAggregate } from "@/hooks/use-nutrition";
import { buildUserTargets } from "@/utils/health-calculator";

export default function HomeScreen() {
  const { data: user } = useCurrentUser();
  const now = Date.now();
  const monthStart = dayjs().startOf("month").valueOf();
  const dayStart = dayjs().startOf("day").valueOf();

  const summary = useExpenseSummary(monthStart, now);
  const recentItems = useExpenses({ limit: 3 });
  const nutrition = useNutritionAggregate(user?.id ?? "", dayStart, now);
  const alerts = useAlerts(user?.id ?? "");
  const targets = buildUserTargets(user ?? {});

  return (
    <Screen>
      <View style={{ gap: 4 }}>
        <Text variant="headlineSmall">Good morning, {user?.name ?? "Smart Shopper"}</Text>
        <Text style={{ color: "#6B7280" }}>{new Date().toDateString()}</Text>
      </View>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <Card style={{ flex: 1 }}>
          <Card.Content style={{ gap: 6 }}>
            <Text>Monthly Spend</Text>
            <PriceTag value={summary.data?.totalSpent ?? 0} />
          </Card.Content>
        </Card>
        <Card style={{ flex: 1 }}>
          <Card.Content style={{ gap: 6 }}>
            <Text>Today Calories</Text>
            <Text variant="titleMedium">
              {Math.round(nutrition.data?.calories ?? 0)} / {targets.calories}
            </Text>
          </Card.Content>
        </Card>
      </View>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <Card style={{ flex: 1 }}>
          <Card.Content>
            <Text>Active Alerts</Text>
            <Text variant="headlineSmall">{alerts.data?.filter((a) => !a.isRead).length ?? 0}</Text>
          </Card.Content>
        </Card>
        <Card style={{ flex: 1 }}>
          <Card.Content>
            <Text>Items This Month</Text>
            <Text variant="headlineSmall">{summary.data?.itemsCount ?? 0}</Text>
          </Card.Content>
        </Card>
      </View>

      <Card>
        <Card.Content style={{ gap: 10 }}>
          <Text variant="titleMedium">Quick Scan</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button
              mode="contained"
              icon="camera"
              style={{ flex: 1 }}
              onPress={() => router.push("/(tabs)/scan/receipt")}
            >
              Scan Receipt
            </Button>
            <Button
              mode="contained-tonal"
              icon="food-apple"
              style={{ flex: 1 }}
              onPress={() => router.push("/(tabs)/scan/nutrition")}
            >
              Scan Label
            </Button>
          </View>
        </Card.Content>
      </Card>

      <Card>
        <Card.Content style={{ gap: 10 }}>
          <Text variant="titleMedium">Recent Purchases</Text>
          {(recentItems.data ?? []).map((item) => (
            <View
              key={item.id}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottomWidth: 1,
                borderColor: "#F3F4F6",
                paddingBottom: 8,
              }}
            >
              <View>
                <Text style={{ fontWeight: "600" }}>{item.name}</Text>
                <Text style={{ color: "#6B7280", fontSize: 12 }}>
                  {item.storeName ?? "Unknown Store"}
                </Text>
              </View>
              <PriceTag value={item.totalPrice} currency={item.currency} />
            </View>
          ))}
          {!recentItems.data?.length ? <Text style={{ color: "#6B7280" }}>No purchases yet.</Text> : null}
        </Card.Content>
      </Card>
    </Screen>
  );
}
