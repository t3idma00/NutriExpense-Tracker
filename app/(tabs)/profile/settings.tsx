import { Alert, View } from "react-native";
import { Card, Switch, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Screen } from "@/components/layout/screen";

function SettingsRow(props: {
  icon: string;
  title: string;
  subtitle: string;
  onPress?: () => void;
}) {
  return (
    <Card
      onPress={props.onPress}
      style={{ borderRadius: 16, backgroundColor: "#F7FAFF" }}
    >
      <Card.Content style={{ gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <MaterialCommunityIcons name={props.icon as never} size={18} color="#1F4E82" />
          <Text style={{ fontWeight: "700", color: "#1D3957" }}>{props.title}</Text>
        </View>
        <Text style={{ color: "#5E738A", fontSize: 12 }}>{props.subtitle}</Text>
      </Card.Content>
    </Card>
  );
}

export default function SettingsScreen() {
  return (
    <Screen>
      <Card style={{ borderRadius: 22, backgroundColor: "#EDF3FB" }}>
        <Card.Content style={{ gap: 8 }}>
          <Text variant="headlineSmall" style={{ fontWeight: "800", color: "#153A5E" }}>
            Settings
          </Text>
          <Text style={{ color: "#5B6F84" }}>
            Privacy, storage, notification timing, and legal controls.
          </Text>
        </Card.Content>
      </Card>

      <Card style={{ borderRadius: 20, backgroundColor: "#F8FAFD" }}>
        <Card.Content style={{ gap: 12 }}>
          <Text variant="titleMedium" style={{ fontWeight: "800", color: "#173D62" }}>
            Privacy and security
          </Text>
          <Text style={{ color: "#60748C" }}>
            Health data is local-first. AI requests send item metadata only.
          </Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: "#1E3550", fontWeight: "600" }}>
              Store receipt images in app-private storage
            </Text>
            <Switch value />
          </View>
        </Card.Content>
      </Card>

      <SettingsRow
        icon="cloud-upload-outline"
        title="Backup and restore"
        subtitle="Cloud backup (planned)"
        onPress={() => Alert.alert("Planned", "Backup and restore will be added in next phase.")}
      />
      <SettingsRow
        icon="bell-outline"
        title="Notifications"
        subtitle="Configure alert timing and severity"
        onPress={() => Alert.alert("Planned", "Notification scheduling settings coming soon.")}
      />
      <SettingsRow
        icon="shield-account-outline"
        title="Legal"
        subtitle="Privacy policy and terms of service"
        onPress={() => Alert.alert("Planned", "Privacy policy and terms screen scaffold pending.")}
      />
    </Screen>
  );
}
