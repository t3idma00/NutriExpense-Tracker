import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { Button, Card, Text } from "react-native-paper";
import { Screen } from "@/components/layout/screen";
import { CategoryChip } from "@/components/ui/category-chip";
import { PriceTag } from "@/components/ui/price-tag";
import { useExpense } from "@/hooks/use-expenses";
import { useNutritionProfile } from "@/hooks/use-nutrition";
import { formatDate } from "@/utils/date";

export default function ExpenseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const expense = useExpense(id ?? "");
  const nutrition = useNutritionProfile(id ?? "");

  if (!expense.data) {
    return (
      <Screen>
        <Text>Loading item details...</Text>
      </Screen>
    );
  }

  const item = expense.data;

  return (
    <Screen>
      <Text variant="headlineSmall">{item.name}</Text>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <CategoryChip category={item.category} />
        <PriceTag value={item.totalPrice} currency={item.currency} />
      </View>

      <Card>
        <Card.Content style={{ gap: 8 }}>
          <Text>Store: {item.storeName ?? "Unknown Store"}</Text>
          <Text>Purchase Date: {formatDate(item.purchaseDate)}</Text>
          <Text>
            Quantity: {item.quantity} {item.unit}
          </Text>
          <Text>Brand: {item.brand ?? "-"}</Text>
          <Text>Notes: {item.notes ?? "-"}</Text>
        </Card.Content>
      </Card>

      <Card>
        <Card.Content style={{ gap: 8 }}>
          <Text variant="titleMedium">Nutrition Profile</Text>
          {nutrition.data ? (
            <>
              <Text>Calories: {nutrition.data.calories?.toFixed(1) ?? "-"} kcal</Text>
              <Text>Protein: {nutrition.data.proteinG?.toFixed(1) ?? "-"} g</Text>
              <Text>Carbs: {nutrition.data.carbsG?.toFixed(1) ?? "-"} g</Text>
              <Text>Fat: {nutrition.data.fatG?.toFixed(1) ?? "-"} g</Text>
              <Text>
                Source: {nutrition.data.source} ({Math.round((nutrition.data.aiConfidenceScore ?? 1) * 100)}%)
              </Text>
            </>
          ) : (
            <Text style={{ color: "#6B7280" }}>No nutrition profile yet.</Text>
          )}
          <Button mode="contained-tonal" onPress={() => router.push(`/(tabs)/expenses/${id}/nutrition`)}>
            Analyze Nutrition
          </Button>
        </Card.Content>
      </Card>
    </Screen>
  );
}
