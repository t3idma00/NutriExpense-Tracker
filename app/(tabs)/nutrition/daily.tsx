import { useMemo, useState } from "react";
import { router } from "expo-router";
import dayjs from "dayjs";
import { View } from "react-native";
import { Button, Card, Chip, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Screen } from "@/components/layout/screen";
import { EmptyState } from "@/components/ui/empty-state";
import { NutrientBar } from "@/components/ui/nutrient-bar";
import { useCurrentUser } from "@/hooks/use-user";
import { useLatestAnalyticsSnapshot } from "@/hooks/use-analytics";
import { useNutritionAggregate, useRecentLogs } from "@/hooks/use-nutrition";
import { useExpenses } from "@/hooks/use-expenses";
import { buildUserTargets } from "@/utils/health-calculator";

function progressPercent(value: number, target: number): number {
  if (!target) return 0;
  return Math.max(0, Math.min(100, Math.round((value / target) * 100)));
}

function statusTone(score: number): { label: string; color: string; background: string } {
  if (score >= 80) {
    return { label: "stable", color: "#1E7058", background: "#DBF3E9" };
  }
  if (score >= 55) {
    return { label: "watch", color: "#8A5A1F", background: "#F6EBD8" };
  }
  return { label: "low alert", color: "#8D2E3A", background: "#F8E2E6" };
}

export default function NutritionDailyScreen() {
  const [selectedDate, setSelectedDate] = useState(dayjs().startOf("day"));
  const { data: user } = useCurrentUser();
  const analytics = useLatestAnalyticsSnapshot();
  const from = selectedDate.valueOf();
  const to = selectedDate.endOf("day").valueOf();
  const targets = buildUserTargets(user ?? {});
  const aggregate = useNutritionAggregate(user?.id ?? "", from, to);
  const logs = useRecentLogs(user?.id ?? "", from, to);
  const items = useExpenses({ from, to, limit: 200 });

  const itemMap = useMemo(
    () => new Map((items.data ?? []).map((entry) => [entry.id, entry.name])),
    [items.data],
  );

  const avgLogConfidence = useMemo(() => {
    const scores = (logs.data ?? [])
      .map((log) => log.confidenceScore)
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    if (!scores.length) return 0;
    return scores.reduce((sum, value) => sum + value, 0) / scores.length;
  }, [logs.data]);

  const overallProgress = useMemo(() => {
    const ratios = [
      progressPercent(aggregate.data?.proteinG ?? 0, targets.proteinG),
      progressPercent(aggregate.data?.fiberG ?? 0, targets.fiberG),
      progressPercent(aggregate.data?.calories ?? 0, targets.calories),
    ];
    return Math.round(ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length);
  }, [aggregate.data, targets]);

  const confidencePercent = Math.round(avgLogConfidence * 100);
  const reliability = Math.round((analytics.data?.reliabilityScore ?? 0) * 100);
  const state = statusTone(overallProgress);

  return (
    <Screen>
      <View
        style={{
          borderRadius: 22,
          borderWidth: 1,
          borderColor: "#D6DEE9",
          backgroundColor: "#F2F6FB",
          padding: 12,
          gap: 10,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Button compact onPress={() => setSelectedDate((value) => value.subtract(1, "day"))}>
            Previous
          </Button>
          <Text variant="titleLarge" style={{ fontWeight: "800", color: "#173B5F" }}>
            {selectedDate.format("MMM D, YYYY")}
          </Text>
          <Button compact onPress={() => setSelectedDate((value) => value.add(1, "day"))}>
            Next
          </Button>
        </View>

        <View style={{ flexDirection: "row", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Chip selected style={{ backgroundColor: "#DDEAF9" }}>
            {`completion ${overallProgress}%`}
          </Chip>
          <Chip style={{ backgroundColor: "#E8F0FB" }}>{`reliability ${reliability}%`}</Chip>
          <Chip style={{ backgroundColor: state.background }}>{state.label}</Chip>
        </View>

        <View
          style={{
            borderRadius: 16,
            backgroundColor: "#E6EEF8",
            paddingHorizontal: 12,
            paddingVertical: 10,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ gap: 3 }}>
            <Text style={{ color: "#53708E", fontSize: 12 }}>Daily completion score</Text>
            <Text variant="headlineSmall" style={{ color: "#1C4A79", fontWeight: "800" }}>
              {overallProgress}%
            </Text>
          </View>

          <View
            style={{
              borderRadius: 999,
              backgroundColor: "#D5E6FA",
              paddingHorizontal: 10,
              paddingVertical: 5,
            }}
          >
            <Text style={{ color: state.color, fontWeight: "700" }}>{state.label}</Text>
          </View>
        </View>
      </View>

      <Card style={{ borderRadius: 20, backgroundColor: "#F7FAFF" }}>
        <Card.Content style={{ gap: 10 }}>
          <Text variant="titleMedium" style={{ fontWeight: "800", color: "#153A5E" }}>
            Daily macro progress
          </Text>
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

      <Card style={{ borderRadius: 20, backgroundColor: "#EEF4FB" }}>
        <Card.Content style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text variant="titleMedium" style={{ fontWeight: "800", color: "#153A5E" }}>
              Data quality
            </Text>
            <View
              style={{
                borderRadius: 999,
                backgroundColor: "#DDE9F8",
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}
            >
              <Text style={{ color: "#21507F", fontWeight: "700" }}>{confidencePercent}% conf</Text>
            </View>
          </View>
          <Text style={{ color: "#51657A" }}>
            Confidence blends source reliability, completeness, and recency.
          </Text>
        </Card.Content>
      </Card>

      <Card style={{ borderRadius: 20, backgroundColor: "#F8FAFD" }}>
        <Card.Content style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text variant="titleMedium" style={{ fontWeight: "800", color: "#153A5E" }}>
              Food log
            </Text>
            <Button compact onPress={() => router.push("/(tabs)/expenses")}>
              add from list
            </Button>
          </View>

          {(logs.data ?? []).map((log) => (
            <View
              key={log.id}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                borderBottomWidth: 1,
                borderColor: "#E6ECF4",
                paddingBottom: 8,
                alignItems: "center",
                gap: 10,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                <MaterialCommunityIcons name="food-apple" size={16} color="#1E5E90" />
                <View>
                  <Text style={{ fontWeight: "700" }}>{itemMap.get(log.expenseItemId) ?? "Expense Item"}</Text>
                  <Text style={{ color: "#60748C", fontSize: 12 }}>{log.consumedServings} servings</Text>
                </View>
              </View>
              <Text style={{ color: "#1A436D", fontWeight: "700" }}>{(log.calories ?? 0).toFixed(0)} kcal</Text>
            </View>
          ))}

          {!logs.data?.length ? (
            <EmptyState
              icon="food-outline"
              title="No nutrition logs for this day"
              description="Log servings from your purchases to unlock daily guidance."
              actionLabel="Open Expenses"
              onAction={() => router.push("/(tabs)/expenses")}
              previewLines={[
                "Chicken Breast  1 serving  165 kcal",
                "Greek Yogurt    1 serving  120 kcal",
              ]}
            />
          ) : null}
        </Card.Content>
      </Card>
    </Screen>
  );
}
