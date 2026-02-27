import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { Card, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Screen } from "@/components/layout/screen";
import { useCurrentUser } from "@/hooks/use-user";

function ActionButton(props: {
  icon: string;
  title: string;
  subtitle: string;
  accent: string;
  bg: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={props.onPress}
      style={{
        flex: 1,
        borderRadius: 22,
        padding: 14,
        backgroundColor: props.bg,
        borderWidth: 1,
        borderColor: `${props.accent}55`,
        gap: 10,
      }}
    >
      <View
        style={{
          width: 46,
          height: 46,
          borderRadius: 23,
          backgroundColor: `${props.accent}22`,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MaterialCommunityIcons name={props.icon as never} size={23} color={props.accent} />
      </View>

      <View style={{ gap: 2 }}>
        <Text style={{ color: "#163B61", fontWeight: "800", fontSize: 16 }}>{props.title}</Text>
        <Text style={{ color: "#5B7189", fontSize: 12 }}>{props.subtitle}</Text>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const { data: user } = useCurrentUser();
  const firstName = user?.name?.trim().split(" ")[0] || "Kumar";

  return (
    <Screen scroll={false} style={{ justifyContent: "center" }}>
      <View style={{ gap: 16 }}>
        <Card style={{ borderRadius: 28, backgroundColor: "#1A2D48", overflow: "hidden" }}>
          <View
            style={{
              position: "absolute",
              top: -34,
              right: -20,
              width: 140,
              height: 140,
              borderRadius: 70,
              backgroundColor: "#2F4C73",
            }}
          />
          <View
            style={{
              position: "absolute",
              bottom: -48,
              left: -26,
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: "#294462",
            }}
          />

          <Card.Content style={{ gap: 12, paddingVertical: 18 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: "#3A5A85",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialCommunityIcons name="home" size={24} color="#F5FAFF" />
              </View>
              <View style={{ gap: 2 }}>
                <Text variant="headlineSmall" style={{ color: "#FFFFFF", fontWeight: "800" }}>
                  Home
                </Text>
                <Text style={{ color: "#CFE0F6" }}>Welcome back, {firstName}</Text>
              </View>
            </View>

            <Text style={{ color: "#E2ECF9", lineHeight: 20 }}>
              Start quickly with receipt capture or voice input.
            </Text>
          </Card.Content>
        </Card>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <ActionButton
            icon="camera"
            title="Scan Receipt"
            subtitle="Capture bill in seconds"
            accent="#1F4E82"
            bg="#EFF4FB"
            onPress={() => router.push("/(tabs)/scan/receipt")}
          />
          <ActionButton
            icon="microphone"
            title="Voice"
            subtitle="Speak your shopping notes"
            accent="#1E7058"
            bg="#ECF7F2"
            onPress={() => router.push("/(tabs)/scan/nutrition")}
          />
        </View>
      </View>
    </Screen>
  );
}
