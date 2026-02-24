import { useMemo, useState } from "react";
import dayjs from "dayjs";
import { View } from "react-native";
import { Button, Card, Text } from "react-native-paper";
import { Screen } from "@/components/layout/screen";
import { NutrientBar } from "@/components/ui/nutrient-bar";
import { useCurrentUser } from "@/hooks/use-user";
import { useNutritionAggregate, useRecentLogs } from "@/hooks/use-nutrition";
import { useExpenses } from "@/hooks/use-expenses";
import { buildUserTargets } from "@/utils/health-calculator";

export default function NutritionDailyScreen() {
  const [selectedDate, setSelectedDate] = useState(dayjs().startOf("day"));
  const { data: user } = useCurrentUser();
  const from = selectedDate.valueOf();
  const to = selectedDate.endOf("day").valueOf();
  const targets = buildUserTargets(user ?? {});
  const aggregate = useNutritionAggregate(user?.id ?? "", from, to);
  const logs = useRecentLogs(user?.id ?? "", from, to);
  const items = useExpenses({ from, to, limit: 200 });

  const itemMap = useMemo(
    () =>
      new Map((items.data ?? []).map((entry) => [entry.id, entry.name])),
    [items.data],
  );

  return (
    <Screen>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Button onPress={() => setSelectedDate((d) => d.subtract(1, "day"))}>Previous</Button>
        <Text variant="headlineSmall">{selectedDate.format("MMM D, YYYY")}</Text>
        <Button onPress={() => setSelectedDate((d) => d.add(1, "day"))}>Next</Button>
      </View>

      <Card>
        <Card.Content style={{ gap: 10 }}>
          <Text variant="titleMedium">Daily Macro Progress</Text>
          <NutrientBar
            label="Calories"
            value={aggregate.data?.calories ?? 0}
            target={targets.calories}
            unit="kcal"
          />
          <NutrientBar
            label="Protein"
            value={aggregate.data?.proteinG ?? 0}
            target={targets.proteinG}
            unit="g"
          />
          <NutrientBar
            label="Carbs"
            value={aggregate.data?.carbsG ?? 0}
            target={targets.carbsG}
            unit="g"
          />
          <NutrientBar
            label="Fat"
            value={aggregate.data?.fatG ?? 0}
            target={targets.fatG}
            unit="g"
          />
          <NutrientBar
            label="Fiber"
            value={aggregate.data?.fiberG ?? 0}
            target={targets.fiberG}
            unit="g"
          />
          <NutrientBar
            label="Sugar"
            value={aggregate.data?.sugarG ?? 0}
            target={targets.sugarG}
            unit="g"
          />
          <NutrientBar
            label="Sodium"
            value={aggregate.data?.sodiumMg ?? 0}
            target={targets.sodiumMg}
            unit="mg"
          />
        </Card.Content>
      </Card>

      <Card>
        <Card.Content style={{ gap: 8 }}>
          <Text variant="titleMedium">Food Log</Text>
          {(logs.data ?? []).map((log) => (
            <View
              key={log.id}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                borderBottomWidth: 1,
                borderColor: "#F3F4F6",
                paddingBottom: 8,
              }}
            >
              <View>
                <Text style={{ fontWeight: "600" }}>
                  {itemMap.get(log.expenseItemId) ?? "Expense Item"}
                </Text>
                <Text style={{ color: "#6B7280", fontSize: 12 }}>
                  {log.consumedServings} servings
                </Text>
              </View>
              <Text>{(log.calories ?? 0).toFixed(0)} kcal</Text>
            </View>
          ))}
          {!logs.data?.length ? <Text style={{ color: "#6B7280" }}>No food logs for this day.</Text> : null}
        </Card.Content>
      </Card>
    </Screen>
  );
}
