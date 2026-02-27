import { useState } from "react";
import { View } from "react-native";
import { Button, Card, Chip, Snackbar, Text } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { Screen } from "@/components/layout/screen";
import { useUpdateUserMutation } from "@/hooks/use-user";
import i18n from "@/services/i18n";
import { useAppStore } from "@/store/app-store";

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
      <Card style={{ borderRadius: 22, backgroundColor: "#EDF3FB" }}>
        <Card.Content style={{ gap: 8 }}>
          <Text variant="headlineSmall" style={{ fontWeight: "800", color: "#153A5E" }}>
            {t("language")}
          </Text>
          <Text style={{ color: "#5B6F84" }}>
            Current language: {preferredLanguage.toUpperCase()}
          </Text>
        </Card.Content>
      </Card>

      <Card style={{ borderRadius: 20, backgroundColor: "#F8FAFD" }}>
        <Card.Content style={{ gap: 10 }}>
          <Text variant="titleMedium" style={{ fontWeight: "800", color: "#173D62" }}>
            App language
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {languages.map((lang) => (
              <Chip
                key={lang.code}
                selected={preferredLanguage === lang.code}
                onPress={() => onSelectLanguage(lang.code)}
                style={{ backgroundColor: preferredLanguage === lang.code ? "#DFEAF8" : "#EEF2F8" }}
              >
                {lang.label}
              </Chip>
            ))}
          </View>
        </Card.Content>
      </Card>

      <Card style={{ borderRadius: 20, backgroundColor: "#F4F8FD" }}>
        <Card.Content style={{ gap: 8 }}>
          <Text variant="titleMedium" style={{ fontWeight: "800", color: "#173D62" }}>
            Translation models
          </Text>
          <Text style={{ color: "#60748C" }}>
            On-device model manager is scaffolded. Hook ML Kit model downloads here for full offline translation.
          </Text>
          <Button mode="outlined" disabled>
            Downloaded models (planned)
          </Button>
        </Card.Content>
      </Card>

      <Snackbar visible={Boolean(status)} onDismiss={() => setStatus(undefined)} duration={1800}>
        {status}
      </Snackbar>
    </Screen>
  );
}
