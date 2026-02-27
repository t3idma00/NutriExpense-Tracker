import { View } from "react-native";
import { Card, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Screen } from "@/components/layout/screen";
import { useCurrentUser } from "@/hooks/use-user";
import {
  buildUserTargets,
  calculateBmi,
  calculateBmr,
  calculateTdee,
} from "@/utils/health-calculator";

function Row(props: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
      <Text style={{ color: "#60748C" }}>{props.label}</Text>
      <Text style={{ color: "#1F3550", fontWeight: "700", flex: 1, textAlign: "right" }}>
        {props.value}
      </Text>
    </View>
  );
}

export default function HealthProfileScreen() {
  const { data: user } = useCurrentUser();
  const hasMetrics =
    Boolean(user?.weightKg) && Boolean(user?.heightCm) && Boolean(user?.age) && Boolean(user?.gender);
  const bmr = hasMetrics
    ? calculateBmr({
        weightKg: user?.weightKg ?? 0,
        heightCm: user?.heightCm ?? 0,
        age: user?.age ?? 0,
        gender: user?.gender ?? "other",
      })
    : 0;
  const tdee = hasMetrics ? calculateTdee(bmr, user?.activityLevel ?? "moderate") : 0;
  const bmi = hasMetrics ? calculateBmi(user?.weightKg ?? 0, user?.heightCm ?? 0) : 0;
  const targets = buildUserTargets(user ?? {});

  return (
    <Screen>
      <Card style={{ borderRadius: 22, backgroundColor: "#EDF3FB" }}>
        <Card.Content style={{ gap: 8 }}>
          <Text variant="headlineSmall" style={{ fontWeight: "800", color: "#153A5E" }}>
            Health profile
          </Text>
          <Text style={{ color: "#5B6F84" }}>
            Personal metrics drive daily nutrient targets and health alerts.
          </Text>
        </Card.Content>
      </Card>

      <Card style={{ borderRadius: 20, backgroundColor: "#F8FAFD" }}>
        <Card.Content style={{ gap: 8 }}>
          <Text variant="titleMedium" style={{ fontWeight: "800", color: "#173D62" }}>
            Baseline data
          </Text>
          <Row label="Weight" value={`${user?.weightKg ?? "-"} kg`} />
          <Row label="Height" value={`${user?.heightCm ?? "-"} cm`} />
          <Row label="Age" value={`${user?.age ?? "-"}`} />
          <Row label="Gender" value={`${user?.gender ?? "-"}`} />
          <Row label="Activity" value={`${user?.activityLevel ?? "-"}`} />
          <Row label="Goals" value={(user?.healthGoals ?? []).join(", ") || "-"} />
        </Card.Content>
      </Card>

      <Card style={{ borderRadius: 20, backgroundColor: "#F4F8FD" }}>
        <Card.Content style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <MaterialCommunityIcons name="chart-line" size={18} color="#1F4E82" />
            <Text variant="titleMedium" style={{ fontWeight: "800", color: "#173D62" }}>
              Calculated targets
            </Text>
          </View>

          <Row label="BMI" value={bmi ? bmi.toFixed(1) : "-"} />
          <Row label="BMR" value={bmr ? `${Math.round(bmr)} kcal` : "-"} />
          <Row label="TDEE" value={tdee ? `${Math.round(tdee)} kcal` : "-"} />
          <Row label="Protein target" value={`${targets.proteinG} g`} />
          <Row label="Carbs target" value={`${targets.carbsG} g`} />
          <Row label="Fat target" value={`${targets.fatG} g`} />
          <Row label="Fiber target" value={`${targets.fiberG} g`} />
          <Row label="Sodium limit" value={`${targets.sodiumMg} mg`} />
        </Card.Content>
      </Card>
    </Screen>
  );
}
