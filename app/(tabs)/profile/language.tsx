import { useState } from "react";
import { View } from "react-native";
import { Button, Card, Chip, Snackbar, Text } from "react-native-paper";
import { useTranslation } from "react-i18next";
import i18n from "@/services/i18n";
import { Screen } from "@/components/layout/screen";
import { useAppStore } from "@/store/app-store";
import { useUpdateUserMutation } from "@/hooks/use-user";

const languages = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "ja", label: "Japanese" },
  { code: "zh", label: "Chinese" },
];

export default function LanguageSettingsScreen() {
  const { t } = useTranslation();
  const preferredLanguage = useAppStore((s) => s.preferredLanguage);
  const setPreferredLanguage = useAppStore((s) => s.setPreferredLanguage);
  const updateUser = useUpdateUserMutation();
  const [status, setStatus] = useState<string>();

  const onSelectLanguage = async (code: string) => {
    setPreferredLanguage(code);
    await i18n.changeLanguage(code);
    await updateUser.mutateAsync({ preferredLanguage: code });
    setStatus(`Language set to ${code.toUpperCase()}`);
  };

  return (
    <Screen>
      <Text variant="headlineSmall">{t("language")}</Text>
      <Card>
        <Card.Content style={{ gap: 10 }}>
          <Text>Current: {preferredLanguage.toUpperCase()}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {languages.map((lang) => (
              <Chip
                key={lang.code}
                selected={preferredLanguage === lang.code}
                onPress={() => onSelectLanguage(lang.code)}
              >
                {lang.label}
              </Chip>
            ))}
          </View>
        </Card.Content>
      </Card>

      <Card>
        <Card.Content style={{ gap: 8 }}>
          <Text variant="titleMedium">Translation Models</Text>
          <Text style={{ color: "#6B7280" }}>
            On-device model manager is scaffolded. Hook ML Kit model downloads here for full offline translation.
          </Text>
          <Button mode="outlined" disabled>
            Downloaded Models (Planned)
          </Button>
        </Card.Content>
      </Card>

      <Snackbar visible={Boolean(status)} onDismiss={() => setStatus(undefined)} duration={1800}>
        {status}
      </Snackbar>
    </Screen>
  );
}
