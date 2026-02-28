import { useEffect } from "react";
import { Stack } from "expo-router";
import { ActivityIndicator, AppState, View } from "react-native";
import { AppProviders } from "@/components/providers/app-providers";
import { useAppBootstrap } from "@/hooks/use-app-bootstrap";
import { syncService } from "@/services/sync.service";

export default function RootLayout() {
  const { isReady } = useAppBootstrap();

  // Sync to PostgreSQL when app comes to foreground
  useEffect(() => {
    if (!isReady) return;
    // Initial sync on app start
    void syncService.pushChanges().then(
      (r) => console.log("[sync] Initial sync result:", JSON.stringify(r)),
      (e) => console.warn("[sync] Initial sync error:", e),
    );
    // Sync when app returns to foreground
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void syncService.pushChanges().then(
          (r) => console.log("[sync] Foreground sync result:", JSON.stringify(r)),
          (e) => console.warn("[sync] Foreground sync error:", e),
        );
      }
    });
    return () => sub.remove();
  }, [isReady]);

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
