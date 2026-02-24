import { View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getCategoryMeta } from "@/constants/categories";
import type { ExpenseCategory } from "@/types";

export function CategoryChip({ category }: { category: ExpenseCategory }) {
  const meta = getCategoryMeta(category);
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: `${meta.color}22`,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
      }}
    >
      <MaterialCommunityIcons name={meta.icon as never} size={14} color={meta.color} />
      <Text style={{ color: meta.color, fontWeight: "600", fontSize: 12 }}>{meta.label}</Text>
    </View>
  );
}
