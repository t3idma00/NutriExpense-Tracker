import { Alert } from "react-native";
import { Card, Switch, Text } from "react-native-paper";
import { Screen } from "@/components/layout/screen";

export default function SettingsScreen() {
  return (
    <Screen>
      <Text variant="headlineSmall">Settings</Text>

      <Card>
        <Card.Content style={{ gap: 12 }}>
          <Text variant="titleMedium">Privacy & Security</Text>
          <Text style={{ color: "#6B7280" }}>
            Health data is local-first. AI requests send item metadata only.
          </Text>
          <Switch value />
          <Text>Store receipt images in app-private storage</Text>
        </Card.Content>
      </Card>

      <Card onPress={() => Alert.alert("Planned", "Backup and restore will be added in next phase.")}>
        <Card.Title title="Backup & Restore" subtitle="Cloud backup (planned)" />
      </Card>
      <Card onPress={() => Alert.alert("Planned", "Notification scheduling settings coming soon.")}>
        <Card.Title title="Notifications" subtitle="Configure alert timing and severity" />
      </Card>
      <Card onPress={() => Alert.alert("Planned", "Privacy policy and terms screen scaffold pending.")}>
        <Card.Title title="Legal" subtitle="Privacy Policy and Terms of Service" />
      </Card>
    </Screen>
  );
}
