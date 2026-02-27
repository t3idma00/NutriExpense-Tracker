import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { Avatar, Card, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Screen } from "@/components/layout/screen";
import { useCurrentUser } from "@/hooks/use-user";

function NavItem(props: {
  icon: string;
  label: string;
  hint: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={props.onPress}
      style={{
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#D7E0EA",
        backgroundColor: "#F6F9FD",
        paddingHorizontal: 12,
        paddingVertical: 11,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: "#DFEAF8",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialCommunityIcons name={props.icon as never} size={18} color="#1F4E82" />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontWeight: "700", color: "#123A60" }}>{props.label}</Text>
          <Text style={{ color: "#5D7086", fontSize: 12 }}>{props.hint}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color="#7B8CA1" />
      </View>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { data: user } = useCurrentUser();

  return (
    <Screen>
      <Card style={{ borderRadius: 22, backgroundColor: "#F2F6FB" }}>
        <Card.Content style={{ alignItems: "center", gap: 8 }}>
          <Avatar.Text
            size={74}
            label={(user?.name ?? "U").slice(0, 2).toUpperCase()}
            style={{ backgroundColor: "#1F4E82" }}
            color="#FFFFFF"
          />
          <Text variant="headlineSmall" style={{ fontWeight: "800", color: "#123A60" }}>
            {user?.name ?? "Smart Shopper"}
          </Text>
          <Text style={{ color: "#61758B" }}>{user?.email ?? "No email added"}</Text>
        </Card.Content>
      </Card>

      <View style={{ gap: 10 }}>
        <NavItem
          icon="account-group-outline"
          label="Family profile"
          hint="Members, age groups, and goals"
          onPress={() => router.push("/(tabs)/profile/family")}
        />
        <NavItem
          icon="heart-pulse"
          label="Health profile"
          hint="Targets and nutrition baseline"
          onPress={() => router.push("/(tabs)/profile/health")}
        />
        <NavItem
          icon="translate"
          label="Language settings"
          hint="Change preferred app language"
          onPress={() => router.push("/(tabs)/profile/language")}
        />
        <NavItem
          icon="cog-outline"
          label="App settings"
          hint="Notifications and preferences"
          onPress={() => router.push("/(tabs)/profile/settings")}
        />
      </View>
    </Screen>
  );
}
