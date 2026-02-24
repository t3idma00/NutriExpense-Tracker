import { Redirect } from "expo-router";
import { useAppStore } from "@/store/app-store";

export default function IndexScreen() {
  const onboardingCompleted = useAppStore((s) => s.onboardingCompleted);
  if (!onboardingCompleted) {
    return <Redirect href="/onboarding" />;
  }
  return <Redirect href="/(tabs)" />;
}
