import { Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { AppProviders } from "@/components/providers/app-providers";
import { useAppBootstrap } from "@/hooks/use-app-bootstrap";

export default function RootLayout() {
  const { isReady } = useAppBootstrap();

  if (!isReady) {
    return (
      <AppProviders>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" />
        </View>
      </AppProviders>
    );
  }

  return (
    <AppProviders>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </AppProviders>
  );
}
