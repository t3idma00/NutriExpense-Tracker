import { useMemo, useState } from "react";
import dayjs from "dayjs";
import { View } from "react-native";
import { Button, Card, SegmentedButtons, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Screen } from "@/components/layout/screen";
import { KpiTile } from "@/components/ui/kpi-tile";
import { useCurrentUser } from "@/hooks/use-user";
import { useNutritionAggregate, useRecentLogs } from "@/hooks/use-nutrition";
import { useLatestAnalyticsSnapshot } from "@/hooks/use-analytics";
import { buildUserTargets } from "@/utils/health-calculator";

type Period = "week" | "month" | "3month" | "year";

function periodStart(period: Period): number {
  if (period === "week") return dayjs().startOf("week").valueOf();
  if (period === "month") return dayjs().startOf("month").valueOf();
  if (period === "3month") return dayjs().subtract(3, "month").startOf("day").valueOf();
  return dayjs().subtract(1, "year").startOf("day").valueOf();
}

function momentumLabel(delta: number): { text: string; tone: "green" | "orange" | "red" } {
  if (delta >= 0.1) return { text: "Improving", tone: "green" };
  if (delta <= -0.1) return { text: "Declining", tone: "red" };
  return { text: "Stable", tone: "orange" };
}

export default function NutritionTrendsScreen() {
  const [period, setPeriod] = useState<Period>("week");
  const { data: user } = useCurrentUser();
  const from = periodStart(period);
  const to = Date.now();
  const aggregate = useNutritionAggregate(user?.id ?? "", from, to);
  const logs = useRecentLogs(user?.id ?? "", from, to);
  const analytics = useLatestAnalyticsSnapshot();
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

  const proteinTrend = analytics.data?.metrics.find((metric) => metric.key === "proteinG");
  const sugarTrend = analytics.data?.metrics.find((metric) => metric.key === "sugarG");
  const momentum = momentumLabel((proteinTrend?.trendSlope ?? 0) - (sugarTrend?.trendSlope ?? 0));

  return (
    <Screen>
      <Card style={{ borderRadius: 20, backgroundColor: "#F1F6FD" }}>
        <Card.Content style={{ gap: 10 }}>
          <Text variant="headlineSmall" style={{ fontWeight: "800", color: "#153A5E" }}>
            Nutrition trends
          </Text>
          <Text style={{ color: "#5A6E85" }}>
            Track momentum and reliability before making nutrition decisions.
          </Text>
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
        </Card.Content>
      </Card>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <KpiTile
          label="Reasoning Reliability"
          value={`${Math.round((analytics.data?.reliabilityScore ?? 0) * 100)}%`}
          hint={`Coverage ${Math.round((analytics.data?.coverageScore ?? 0) * 100)}%`}
          icon="shield-check-outline"
          tone="blue"
        />
        <KpiTile
          label="Trend Momentum"
          value={momentum.text}
          hint={`${analytics.data?.anomalyCount ?? 0} anomalies`}
          icon="chart-line"
          tone={momentum.tone}
        />
      </View>

      <Card style={{ borderRadius: 20, backgroundColor: "#F8FAFD" }}>
        <Card.Content style={{ gap: 8 }}>
          <Text variant="titleMedium" style={{ fontWeight: "800", color: "#173D62" }}>
            Period averages
          </Text>

          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text>Calories</Text>
            <Text>{`${averages.calories.toFixed(0)} / ${targets.calories} kcal`}</Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text>Protein</Text>
            <Text>{`${averages.proteinG.toFixed(1)} / ${targets.proteinG} g`}</Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text>Carbs</Text>
            <Text>{`${averages.carbsG.toFixed(1)} / ${targets.carbsG} g`}</Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text>Fat</Text>
            <Text>{`${averages.fatG.toFixed(1)} / ${targets.fatG} g`}</Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text>Sugar</Text>
            <Text>{`${averages.sugarG.toFixed(1)} / ${targets.sugarG} g`}</Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text>Sodium</Text>
            <Text>{`${averages.sodiumMg.toFixed(0)} / ${targets.sodiumMg} mg`}</Text>
          </View>
        </Card.Content>
      </Card>

      <Card style={{ borderRadius: 20, backgroundColor: "#EEF4FB" }}>
        <Card.Content style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
            <MaterialCommunityIcons name="lightbulb-on-outline" size={17} color="#1F4E82" />
            <Text variant="titleMedium" style={{ fontWeight: "800", color: "#173D62" }}>
              Actionable insight
            </Text>
          </View>
          <Text style={{ color: "#5A6E85" }}>
            {averages.sugarG > targets.sugarG
              ? "Sugar remains above target. Prioritize low-sugar substitutions on your next shop."
              : "Sugar is within range. Keep current snack and beverage choices."}
          </Text>
          <Text style={{ color: "#5A6E85" }}>
            {averages.proteinG < targets.proteinG * 0.8
              ? "Protein is below target. Add one high-protein item to tomorrow's meals."
              : "Protein trend is healthy. Maintain current intake patterns."}
          </Text>
        </Card.Content>
      </Card>

      <Button mode="outlined" disabled>
        Export PDF Report (Planned)
      </Button>
    </Screen>
  );
}
