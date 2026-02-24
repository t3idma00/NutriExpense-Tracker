import { useState } from "react";
import { Image, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { Button, Card, SegmentedButtons, Text, TextInput } from "react-native-paper";
import { Screen } from "@/components/layout/screen";
import { useScanStore } from "@/store/scan-store";

type CaptureMode = "manual" | "auto";

export default function ReceiptScanScreen() {
  const setReceiptDraft = useScanStore((s) => s.setReceiptDraft);
  const [previewUri, setPreviewUri] = useState<string>();
  const [rawTextOverride, setRawTextOverride] = useState("");
  const [mode, setMode] = useState<CaptureMode>("manual");

  const pickImage = async (source: "camera" | "gallery") => {
    const permission =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });

    if (result.canceled) return;

    const uri = result.assets[0]?.uri;
    if (!uri) return;

    setPreviewUri(uri);
    setReceiptDraft({ imageUri: uri, rawTextOverride });
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push("/(tabs)/scan/processing");
  };

  return (
    <Screen>
      <Text variant="headlineSmall">Receipt Camera</Text>
      <Text style={{ color: "#6B7280" }}>
        Use camera or import from gallery. OCR override is optional for testing.
      </Text>

      <SegmentedButtons
        value={mode}
        onValueChange={(value) => setMode(value as CaptureMode)}
        buttons={[
          { value: "manual", label: "Manual Capture" },
          { value: "auto", label: "Auto Capture" },
        ]}
      />

      <Card>
        <Card.Content style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button mode="contained" style={{ flex: 1 }} onPress={() => pickImage("camera")}>
              Open Camera
            </Button>
            <Button mode="contained-tonal" style={{ flex: 1 }} onPress={() => pickImage("gallery")}>
              Import Image
            </Button>
          </View>
          {previewUri ? (
            <Image
              source={{ uri: previewUri }}
              style={{ width: "100%", height: 220, borderRadius: 16 }}
              resizeMode="cover"
            />
          ) : null}
        </Card.Content>
      </Card>

      <Card>
        <Card.Content style={{ gap: 8 }}>
          <Text variant="titleMedium">Raw OCR Override (Optional)</Text>
          <TextInput
            mode="outlined"
            multiline
            numberOfLines={8}
            value={rawTextOverride}
            onChangeText={setRawTextOverride}
            placeholder="Paste receipt text here to bypass OCR in demo mode..."
          />
        </Card.Content>
      </Card>
    </Screen>
  );
}
