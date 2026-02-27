import { Tabs } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const TAB_BAR_COLOR = "#F5F7FB";
const ACTIVE = "#1F4E82";
const INACTIVE = "#7E8CA0";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACTIVE,
        tabBarInactiveTintColor: INACTIVE,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          marginTop: 2,
        },
        tabBarStyle: {
          height: 72,
          paddingTop: 8,
          paddingBottom: 8,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          borderTopWidth: 1,
          borderColor: "#D6DEE9",
          backgroundColor: TAB_BAR_COLOR,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: "Scan",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="camera" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{
          title: "Health",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="heart-pulse" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: "List",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="format-list-bulleted" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Family",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
