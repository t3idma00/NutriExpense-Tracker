import { PropsWithChildren, useEffect, useMemo } from "react";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PaperProvider } from "react-native-paper";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useThemeTokens } from "@/constants/theme";
import { useAppStore } from "@/store/app-store";
import i18n from "@/services/i18n";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldSetBadge: false,
  }),
});

export function AppProviders({ children }: PropsWithChildren) {
  const queryClient = useMemo(() => new QueryClient(), []);
  const { paperTheme, mode } = useThemeTokens();
  const preferredLanguage = useAppStore((s) => s.preferredLanguage);

  useEffect(() => {
    void Notifications.requestPermissionsAsync();
  }, []);

  useEffect(() => {
    void i18n.changeLanguage(preferredLanguage);
  }, [preferredLanguage]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <PaperProvider theme={paperTheme}>
          <StatusBar style={mode === "dark" ? "light" : "dark"} />
          {children}
        </PaperProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
