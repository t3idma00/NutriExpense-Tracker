import { useEffect, useState } from "react";
import { initDatabase } from "@/db/database";
import { repositories } from "@/db/repositories";
import { useAppStore } from "@/store/app-store";

export function useAppBootstrap() {
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const setOnboardingCompleted = useAppStore((s) => s.setOnboardingCompleted);
  const setPreferredLanguage = useAppStore((s) => s.setPreferredLanguage);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      await initDatabase();
      let user = await repositories.user.getCurrentUser();
      if (!user) {
        user = await repositories.user.createDefaultUser("Smart Shopper");
      }
      await repositories.household.ensureDefaultHouseholdForUser(user.id, user.name);
      setCurrentUser(user);
      setOnboardingCompleted(user.onboardingCompleted);
      setPreferredLanguage(user.preferredLanguage ?? "en");
      if (mounted) setIsReady(true);
    };

    void run();

    return () => {
      mounted = false;
    };
  }, [setCurrentUser, setOnboardingCompleted, setPreferredLanguage]);

  return { isReady };
}
