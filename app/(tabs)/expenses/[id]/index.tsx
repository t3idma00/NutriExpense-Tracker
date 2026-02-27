import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { Button, Card, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Screen } from "@/components/layout/screen";
import { CategoryChip } from "@/components/ui/category-chip";
import { PriceTag } from "@/components/ui/price-tag";
import { useConsumptionModels } from "@/hooks/use-analytics";
import { useExpense } from "@/hooks/use-expenses";
import { useNutritionProfile } from "@/hooks/use-nutrition";
import { formatDate } from "@/utils/date";

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

export default function ExpenseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const expense = useExpense(id ?? "");
  const nutrition = useNutritionProfile(id ?? "");
  const models = useConsumptionModels(200);

  if (!expense.data) {
    return (
      <Screen>
        <Card style={{ borderRadius: 18, backgroundColor: "#F4F8FD" }}>
          <Card.Content>
            <Text style={{ color: "#4F657D" }}>Loading item details...</Text>
          </Card.Content>
        </Card>
      </Screen>
    );
  }

  const item = expense.data;
  const model = (models.data ?? []).find((entry) => entry.expenseItemId === item.id);

  return (
    <Screen>
      <Card style={{ borderRadius: 22, backgroundColor: "#EDF3FB" }}>
        <Card.Content style={{ gap: 10 }}>
          <View style={{ gap: 4 }}>
            <Text variant="headlineSmall" style={{ fontWeight: "800", color: "#153A5E" }}>
              {item.name}
            </Text>
            <Text style={{ color: "#5A6F85" }}>{item.storeName ?? "Unknown store"}</Text>
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <CategoryChip category={item.category} />
            <PriceTag value={item.totalPrice} currency={item.currency} />
          </View>
        </Card.Content>
      </Card>

      <Card style={{ borderRadius: 20, backgroundColor: "#F8FAFD" }}>
        <Card.Content style={{ gap: 8 }}>
          <Text variant="titleMedium" style={{ fontWeight: "800", color: "#173D62" }}>
            Item details
          </Text>
          <Row label="Purchase date" value={formatDate(item.purchaseDate)} />
          <Row label="Quantity" value={`${item.quantity} ${item.unit}`} />
          <Row label="Brand" value={item.brand ?? "-"} />
          <Row label="Notes" value={item.notes ?? "-"} />
        </Card.Content>
      </Card>

      <Card style={{ borderRadius: 20, backgroundColor: "#F4F8FD" }}>
        <Card.Content style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <MaterialCommunityIcons name="heart-pulse" size={18} color="#1F4E82" />
            <Text variant="titleMedium" style={{ fontWeight: "800", color: "#173D62" }}>
              Nutrition profile
            </Text>
          </View>

          {nutrition.data ? (
            <>
              <Row label="Calories" value={`${nutrition.data.calories?.toFixed(1) ?? "-"} kcal`} />
              <Row label="Protein" value={`${nutrition.data.proteinG?.toFixed(1) ?? "-"} g`} />
              <Row label="Carbs" value={`${nutrition.data.carbsG?.toFixed(1) ?? "-"} g`} />
              <Row label="Fat" value={`${nutrition.data.fatG?.toFixed(1) ?? "-"} g`} />
              <Row
                label="Source"
                value={`${nutrition.data.source} (${Math.round((nutrition.data.aiConfidenceScore ?? 1) * 100)}%)`}
              />
              <Row
                label="Model confidence"
                value={`${Math.round((model?.confidence ?? 0) * 100)}%`}
              />
            </>
          ) : (
            <Text style={{ color: "#5F748B" }}>No nutrition profile yet.</Text>
          )}

          <Button mode="contained-tonal" onPress={() => router.push(`/(tabs)/expenses/${id}/nutrition`)}>
            Analyze nutrition
          </Button>
        </Card.Content>
      </Card>
    </Screen>
  );
}
