import { useColorScheme } from "react-native";
import { MD3DarkTheme, MD3LightTheme } from "react-native-paper";

const navy = {
  50: "#EAF2FB",
  100: "#D7E7F8",
  200: "#B7D3F1",
  300: "#8EB7E3",
  400: "#648FC8",
  500: "#3C6FA8",
  600: "#2E5B8D",
  700: "#244A74",
  800: "#1D3B5E",
  900: "#152B44",
};

const slate = {
  50: "#F7F8FA",
  100: "#EFF1F5",
  200: "#E3E7ED",
  300: "#CCD4DD",
  400: "#A2AFBC",
  500: "#748292",
  600: "#5E6C7B",
  700: "#4A5663",
  800: "#333E4A",
  900: "#212A35",
};

const mint = {
  100: "#E8FAF4",
  300: "#8FE4C6",
  500: "#2C9D79",
  700: "#1E7058",
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
  sm: 8,
  md: 14,
  lg: 18,
  xl: 24,
  full: 9999,
} as const;

export const typography = {
  xs: 11,
  sm: 13,
  base: 15,
  lg: 17,
  xl: 21,
  "2xl": 26,
  "3xl": 30,
  "4xl": 36,
} as const;

export const appTheme = {
  colors: {
    primary: navy[700],
    secondary: navy[400],
    success: mint[500],
    warning: "#B7791F",
    danger: "#B23A42",
    backgroundLight: "#ECEFF4",
    backgroundDark: "#111926",
    surfaceSoft: "#E7EDF5",
    surfaceStrong: "#152B44",
    navy,
    slate,
    mint,
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
    surface: "#F3F5F9",
    surfaceVariant: appTheme.colors.surfaceSoft,
    outline: "#D1D9E4",
    error: appTheme.colors.danger,
    onPrimary: "#FFFFFF",
    onSurface: "#102035",
    onSurfaceVariant: "#5E6C7B",
  },
};

export const darkPaperTheme = {
  ...MD3DarkTheme,
  roundness: radius.md,
  colors: {
    ...MD3DarkTheme.colors,
    primary: "#9DBDE3",
    secondary: "#7EA7D8",
    background: appTheme.colors.backgroundDark,
    surface: "#182233",
    surfaceVariant: "#243044",
    outline: "#36465D",
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
