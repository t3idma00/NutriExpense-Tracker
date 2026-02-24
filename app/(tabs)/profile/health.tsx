import { Card, Text } from "react-native-paper";
import { Screen } from "@/components/layout/screen";
import { useCurrentUser } from "@/hooks/use-user";
import {
  buildUserTargets,
  calculateBmi,
  calculateBmr,
  calculateTdee,
} from "@/utils/health-calculator";

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
      <Text variant="headlineSmall">Health Profile</Text>
      <Card>
        <Card.Content style={{ gap: 8 }}>
          <Text>Weight: {user?.weightKg ?? "-"} kg</Text>
          <Text>Height: {user?.heightCm ?? "-"} cm</Text>
          <Text>Age: {user?.age ?? "-"}</Text>
          <Text>Gender: {user?.gender ?? "-"}</Text>
          <Text>Activity: {user?.activityLevel ?? "-"}</Text>
          <Text>Goals: {(user?.healthGoals ?? []).join(", ") || "-"}</Text>
        </Card.Content>
      </Card>

      <Card>
        <Card.Content style={{ gap: 8 }}>
          <Text variant="titleMedium">Calculated Targets</Text>
          <Text>BMI: {bmi ? bmi.toFixed(1) : "-"}</Text>
          <Text>BMR: {bmr ? Math.round(bmr) : "-"} kcal</Text>
          <Text>TDEE: {tdee ? Math.round(tdee) : "-"} kcal</Text>
          <Text>Protein Target: {targets.proteinG} g</Text>
          <Text>Carbs Target: {targets.carbsG} g</Text>
          <Text>Fat Target: {targets.fatG} g</Text>
          <Text>Fiber Target: {targets.fiberG} g</Text>
          <Text>Sodium Limit: {targets.sodiumMg} mg</Text>
        </Card.Content>
      </Card>
    </Screen>
  );
}
