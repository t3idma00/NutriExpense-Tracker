import { View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text } from "react-native-paper";

interface KpiTileProps {
  label: string;
  value: string;
  hint?: string;
  icon: string;
  tone?: "blue" | "green" | "orange" | "red";
}

const palette: Record<
  NonNullable<KpiTileProps["tone"]>,
  { bg: string; fg: string; chip: string }
> = {
  blue: { bg: "#E7EEF7", fg: "#1D3B5E", chip: "#D2E1F3" },
  green: { bg: "#EAF6F1", fg: "#1E7058", chip: "#CFEDE0" },
  orange: { bg: "#F7F1E4", fg: "#9A6A1C", chip: "#EFE1C1" },
  red: { bg: "#F8ECEE", fg: "#9B3841", chip: "#F1D2D7" },
};

export function KpiTile({
  label,
  value,
  hint,
  icon,
  tone = "blue",
}: KpiTileProps) {
  const colors = palette[tone];
  return (
    <View
      style={{
        flex: 1,
        minHeight: 104,
        borderRadius: 18,
        backgroundColor: colors.bg,
        borderWidth: 1,
        borderColor: `${colors.fg}20`,
        padding: 12,
        gap: 6,
      }}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: colors.chip,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MaterialCommunityIcons name={icon as never} size={16} color={colors.fg} />
      </View>
      <Text style={{ color: "#6B7280", fontSize: 12 }}>{label}</Text>
      <Text variant="titleLarge" style={{ color: colors.fg, fontWeight: "800" }}>
        {value}
      </Text>
      {hint ? <Text style={{ color: "#6B7280", fontSize: 12 }}>{hint}</Text> : null}
    </View>
  );
}
