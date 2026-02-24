import { router } from "expo-router";
import { View } from "react-native";
import { Avatar, Button, Card, Text } from "react-native-paper";
import { Screen } from "@/components/layout/screen";
import { useCurrentUser } from "@/hooks/use-user";

export default function ProfileScreen() {
  const { data: user } = useCurrentUser();

  return (
    <Screen>
      <Card>
        <Card.Content style={{ alignItems: "center", gap: 8 }}>
          <Avatar.Text size={72} label={(user?.name ?? "U").slice(0, 2).toUpperCase()} />
          <Text variant="headlineSmall">{user?.name ?? "Smart Shopper"}</Text>
          <Text style={{ color: "#6B7280" }}>{user?.email ?? "No email added"}</Text>
        </Card.Content>
      </Card>

      <View style={{ gap: 10 }}>
        <Button mode="contained-tonal" onPress={() => router.push("/(tabs)/profile/health")}>
          Health Profile
        </Button>
        <Button mode="contained-tonal" onPress={() => router.push("/(tabs)/profile/language")}>
          Language Settings
        </Button>
        <Button mode="contained-tonal" onPress={() => router.push("/(tabs)/profile/settings")}>
          App Settings
        </Button>
      </View>
    </Screen>
  );
}
