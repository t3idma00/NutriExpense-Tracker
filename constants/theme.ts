import { useColorScheme } from "react-native";
import { MD3LightTheme, MD3DarkTheme } from "react-native-paper";

const blue = {
  50: "#EFF6FF",
  100: "#DBEAFE",
  200: "#BFDBFE",
  300: "#93C5FD",
  400: "#60A5FA",
  500: "#3B82F6",
  600: "#2563EB",
  700: "#1D4ED8",
  800: "#1A56DB",
  900: "#1E3A8A",
};

const gray = {
  50: "#F9FAFB",
  100: "#F3F4F6",
  200: "#E5E7EB",
  300: "#D1D5DB",
  400: "#9CA3AF",
  500: "#6B7280",
  600: "#4B5563",
  700: "#374151",
  800: "#1F2937",
  900: "#111827",
};

export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

export const radius = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const typography = {
  xs: 11,
  sm: 13,
  base: 15,
  lg: 17,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
  "4xl": 36,
} as const;

export const appTheme = {
  colors: {
    primary: "#1A56DB",
    secondary: "#7C3AED",
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
    backgroundLight: "#FAFAFA",
    backgroundDark: "#111827",
    blue,
    gray,
  },
  spacing,
  radius,
  typography,
};

export const lightPaperTheme = {
  ...MD3LightTheme,
  roundness: radius.md,
  colors: {
    ...MD3LightTheme.colors,
    primary: appTheme.colors.primary,
    secondary: appTheme.colors.secondary,
    background: appTheme.colors.backgroundLight,
    surface: "#FFFFFF",
    error: appTheme.colors.danger,
  },
};

export const darkPaperTheme = {
  ...MD3DarkTheme,
  roundness: radius.md,
  colors: {
    ...MD3DarkTheme.colors,
    primary: "#60A5FA",
    secondary: "#A78BFA",
    background: appTheme.colors.backgroundDark,
    surface: gray[800],
    error: appTheme.colors.danger,
  },
};

export function useThemeTokens() {
  const mode = useColorScheme();
  return {
    ...appTheme,
    mode: mode ?? "light",
    paperTheme: mode === "dark" ? darkPaperTheme : lightPaperTheme,
  };
}
