import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { Card, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Screen } from "@/components/layout/screen";

function ScanTile(props: {
  title: string;
  subtitle: string;
  icon: string;
  accent: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={props.onPress}
      style={{
        borderRadius: 20,
        borderWidth: 1,
        borderColor: `${props.accent}55`,
        backgroundColor: `${props.accent}12`,
        padding: 12,
        gap: 10,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <View style={{ gap: 4, flex: 1 }}>
          <Text variant="titleLarge" style={{ fontWeight: "800", color: "#12395E" }}>
            {props.title}
          </Text>
          <Text style={{ color: "#4E6176" }}>{props.subtitle}</Text>
        </View>

        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: `${props.accent}20`,
          }}
        >
          <MaterialCommunityIcons name={props.icon as never} size={22} color={props.accent} />
        </View>
      </View>

      <View
        style={{
          borderRadius: 14,
          backgroundColor: "#EAF2FA",
          paddingHorizontal: 10,
          paddingVertical: 8,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ color: "#1F4E82", fontWeight: "700" }}>Open capture flow</Text>
        <MaterialCommunityIcons name="arrow-right" size={18} color="#1F4E82" />
      </View>
    </Pressable>
  );
}

export default function ScanIndexScreen() {
  return (
    <Screen>
      <Card style={{ borderRadius: 20, backgroundColor: "#EAF2FB" }}>
        <Card.Content style={{ gap: 8 }}>
          <Text variant="headlineSmall" style={{ fontWeight: "800", color: "#153A5E" }}>
            Scan Center
          </Text>
          <Text style={{ color: "#4E6176" }}>
            Capture high-quality receipts and nutrition labels in under 30 seconds.
          </Text>

          <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <MaterialCommunityIcons name="timer-outline" size={16} color="#1A56DB" />
              <Text style={{ color: "#1A56DB", fontWeight: "700", fontSize: 12 }}>Fast flow</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <MaterialCommunityIcons name="shield-check-outline" size={16} color="#1A56DB" />
              <Text style={{ color: "#1A56DB", fontWeight: "700", fontSize: 12 }}>Confidence scoring</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <ScanTile
        title="Receipt scan"
        subtitle="Extract store, line items, totals, and categories with review control."
        icon="receipt-text-check-outline"
        accent="#1A56DB"
        onPress={() => router.push("/(tabs)/scan/receipt")}
      />

      <ScanTile
        title="Nutrition scan"
        subtitle="Capture labels or barcode data and attach nutrition to purchased items."
        icon="food-apple-outline"
        accent="#1E7058"
        onPress={() => router.push("/(tabs)/scan/nutrition")}
      />

      <Card style={{ borderRadius: 20, backgroundColor: "#F5F8FD" }}>
        <Card.Content style={{ gap: 8 }}>
          <Text variant="titleMedium" style={{ fontWeight: "800", color: "#173D62" }}>
            Best capture tips
          </Text>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <MaterialCommunityIcons name="numeric-1-circle-outline" size={18} color="#1F4E82" />
            <Text style={{ color: "#5B6E84" }}>Keep receipt flat with full edges visible.</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <MaterialCommunityIcons name="numeric-2-circle-outline" size={18} color="#1F4E82" />
            <Text style={{ color: "#5B6E84" }}>Avoid shadows and glare under bright light.</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <MaterialCommunityIcons name="numeric-3-circle-outline" size={18} color="#1F4E82" />
            <Text style={{ color: "#5B6E84" }}>Review low-confidence rows before saving.</Text>
          </View>
        </Card.Content>
      </Card>
    </Screen>
  );
}
