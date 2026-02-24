import { View } from "react-native";
import { ProgressBar, Text } from "react-native-paper";

interface NutrientBarProps {
  label: string;
  value: number;
  target: number;
  unit: string;
}

export function NutrientBar({ label, value, target, unit }: NutrientBarProps) {
  const ratio = target > 0 ? value / target : 0;
  const color = ratio > 1.2 ? "#EF4444" : ratio < 0.7 ? "#F59E0B" : "#10B981";

  return (
    <View style={{ gap: 6 }}>
      <View
        style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
      >
        <Text>{label}</Text>
        <Text style={{ color: "#6B7280" }}>
          {value.toFixed(1)}{unit} / {target.toFixed(1)}{unit}
        </Text>
      </View>
      <ProgressBar progress={Math.min(1, ratio)} color={color} />
    </View>
  );
}
