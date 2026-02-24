import { useMemo, useState } from "react";
import dayjs from "dayjs";
import { View } from "react-native";
import { Button, Card, SegmentedButtons, Text } from "react-native-paper";
import { Screen } from "@/components/layout/screen";
import { useCurrentUser } from "@/hooks/use-user";
import { useNutritionAggregate, useRecentLogs } from "@/hooks/use-nutrition";
import { buildUserTargets } from "@/utils/health-calculator";

type Period = "week" | "month" | "3month" | "year";

function periodStart(period: Period): number {
  if (period === "week") return dayjs().startOf("week").valueOf();
  if (period === "month") return dayjs().startOf("month").valueOf();
  if (period === "3month") return dayjs().subtract(3, "month").startOf("day").valueOf();
  return dayjs().subtract(1, "year").startOf("day").valueOf();
}

export default function NutritionTrendsScreen() {
  const [period, setPeriod] = useState<Period>("week");
  const { data: user } = useCurrentUser();
  const from = periodStart(period);
  const to = Date.now();
  const aggregate = useNutritionAggregate(user?.id ?? "", from, to);
  const logs = useRecentLogs(user?.id ?? "", from, to);
  const targets = buildUserTargets(user ?? {});

  const dayCount = useMemo(() => {
    const uniqueDays = new Set((logs.data ?? []).map((log) => dayjs(log.logDate).format("YYYY-MM-DD")));
    return Math.max(1, uniqueDays.size);
  }, [logs.data]);

  const averages = {
    calories: (aggregate.data?.calories ?? 0) / dayCount,
    proteinG: (aggregate.data?.proteinG ?? 0) / dayCount,
    carbsG: (aggregate.data?.carbsG ?? 0) / dayCount,
    fatG: (aggregate.data?.fatG ?? 0) / dayCount,
    sugarG: (aggregate.data?.sugarG ?? 0) / dayCount,
    sodiumMg: (aggregate.data?.sodiumMg ?? 0) / dayCount,
  };

  return (
    <Screen>
      <Text variant="headlineSmall">Nutrition Trends</Text>
      <SegmentedButtons
        value={period}
        onValueChange={(value) => setPeriod(value as Period)}
        buttons={[
          { value: "week", label: "Week" },
          { value: "month", label: "Month" },
          { value: "3month", label: "3-Month" },
          { value: "year", label: "Year" },
        ]}
      />

      <Card>
        <Card.Content style={{ gap: 8 }}>
          <Text variant="titleMedium">Period Averages</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text>Calories</Text>
            <Text>
              {averages.calories.toFixed(0)} / {targets.calories} kcal
            </Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text>Protein</Text>
            <Text>
              {averages.proteinG.toFixed(1)} / {targets.proteinG} g
            </Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text>Carbs</Text>
            <Text>
              {averages.carbsG.toFixed(1)} / {targets.carbsG} g
            </Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text>Fat</Text>
            <Text>
              {averages.fatG.toFixed(1)} / {targets.fatG} g
            </Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text>Sugar</Text>
            <Text>
              {averages.sugarG.toFixed(1)} / {targets.sugarG} g
            </Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text>Sodium</Text>
            <Text>
              {averages.sodiumMg.toFixed(0)} / {targets.sodiumMg} mg
            </Text>
          </View>
        </Card.Content>
      </Card>

      <Card>
        <Card.Content style={{ gap: 8 }}>
          <Text variant="titleMedium">Pattern Insight</Text>
          <Text style={{ color: "#6B7280" }}>
            {averages.sugarG > targets.sugarG
              ? "Sugar trend is above target. Reduce bakery and sweetened beverage intake."
              : "Sugar trend is under control. Maintain current choices."}
          </Text>
          <Text style={{ color: "#6B7280" }}>
            {averages.proteinG < targets.proteinG * 0.8
              ? "Protein intake is low. Add lean proteins to your logged meals."
              : "Protein intake is improving toward target."}
          </Text>
        </Card.Content>
      </Card>

      <Button mode="outlined" disabled>
        Export PDF Report (Planned)
      </Button>
    </Screen>
  );
}
