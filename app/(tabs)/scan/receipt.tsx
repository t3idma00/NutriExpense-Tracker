import { useState } from "react";
import { Image, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { Button, Card, SegmentedButtons, Text, TextInput } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Screen } from "@/components/layout/screen";
import { useScanStore } from "@/store/scan-store";
import { isCloudReceiptOcrEnabled } from "@/services/receipt-ocr.service";

type CaptureMode = "manual" | "auto";

export default function ReceiptScanScreen() {
  const setReceiptDraft = useScanStore((s) => s.setReceiptDraft);
  const cloudOcrEnabled = isCloudReceiptOcrEnabled();
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
      <Card style={{ borderRadius: 20, backgroundColor: "#EEF4FB" }}>
        <Card.Content style={{ gap: 8 }}>
          <Text variant="headlineSmall" style={{ fontWeight: "800", color: "#153A5E" }}>
            Receipt camera
          </Text>
          <Text style={{ color: "#566A80" }}>
            Use camera or import from gallery. OCR override is optional for testing.
          </Text>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <MaterialCommunityIcons
              name={cloudOcrEnabled ? "check-decagram" : "alert-circle-outline"}
              size={16}
              color={cloudOcrEnabled ? "#1E7058" : "#B7791F"}
            />
            <Text style={{ color: cloudOcrEnabled ? "#1E7058" : "#8A5A1F", fontSize: 12 }}>
              {cloudOcrEnabled
                ? "Cloud OCR enabled: receipt text will be extracted from captured images."
                : "Cloud OCR disabled: set EXPO_PUBLIC_GEMINI_API_KEY (or EXPO_PUBLIC_OCR_SPACE_API_KEY) for real text extraction."}
            </Text>
          </View>
        </Card.Content>
      </Card>

      <SegmentedButtons
        value={mode}
        onValueChange={(value) => setMode(value as CaptureMode)}
        buttons={[
          { value: "manual", label: "Manual Capture" },
          { value: "auto", label: "Auto Capture" },
        ]}
      />

      <Card style={{ borderRadius: 20, backgroundColor: "#F7FAFF" }}>
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
          ) : (
            <View
              style={{
                height: 180,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: "#D7E1EE",
                backgroundColor: "#EDF3FB",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <MaterialCommunityIcons name="camera-plus-outline" size={26} color="#1F4E82" />
              <Text style={{ color: "#4E6176" }}>Camera preview will appear here</Text>
            </View>
          )}
        </Card.Content>
      </Card>

      <Card style={{ borderRadius: 20, backgroundColor: "#F7F9FD" }}>
        <Card.Content style={{ gap: 8 }}>
          <Text variant="titleMedium" style={{ fontWeight: "800", color: "#173D62" }}>
            Raw OCR override (optional)
          </Text>
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
