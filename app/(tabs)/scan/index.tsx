import { router } from "expo-router";
import { Card, Text } from "react-native-paper";
import { Screen } from "@/components/layout/screen";

export default function ScanIndexScreen() {
  return (
    <Screen>
      <Text variant="headlineSmall">Scan Center</Text>
      <Text style={{ color: "#6B7280" }}>
        Capture receipts and nutrition labels with SmartSpendAI.
      </Text>

      <Card onPress={() => router.push("/(tabs)/scan/receipt")}>
        <Card.Title title="Receipt Scan" subtitle="Scan bill and auto-parse line items" />
      </Card>
      <Card onPress={() => router.push("/(tabs)/scan/nutrition")}>
        <Card.Title
          title="Nutrition Label Scan"
          subtitle="Parse calories, macros, and micronutrients"
        />
      </Card>
    </Screen>
  );
}
