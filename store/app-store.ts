import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { UserProfile } from "@/types";

interface AppState {
  currentUserId?: string;
  preferredLanguage: string;
  onboardingCompleted: boolean;
  setPreferredLanguage: (language: string) => void;
  setCurrentUser: (user: UserProfile) => void;
  completeOnboarding: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentUserId: undefined,
      preferredLanguage: "en",
      onboardingCompleted: false,
      setPreferredLanguage: (preferredLanguage) => set({ preferredLanguage }),
      setCurrentUser: (user) => set({ currentUserId: user.id }),
      completeOnboarding: () => set({ onboardingCompleted: true }),
    }),
    {
      name: "smartspend-app",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
