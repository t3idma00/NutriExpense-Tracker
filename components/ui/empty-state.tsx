import { View } from "react-native";
import { Button, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: string;
  previewLines?: string[];
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon = "sparkles-outline",
  previewLines,
}: EmptyStateProps) {
  return (
    <View
      style={{
        padding: 18,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "#D6DEE9",
        backgroundColor: "#EFF3F8",
        gap: 10,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: "#D7E4F2",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialCommunityIcons name={icon as never} size={18} color="#234A74" />
        </View>
        <Text variant="titleMedium">{title}</Text>
      </View>

      {previewLines?.length ? (
        <View
          style={{
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#DDE5EF",
            backgroundColor: "#F7FAFD",
            padding: 10,
            gap: 4,
          }}
        >
          {previewLines.map((line) => (
            <Text key={line} style={{ color: "#9CA3AF", opacity: 0.62 }}>
              {line}
            </Text>
          ))}
        </View>
      ) : null}

      <Text style={{ color: "#4B5563" }}>{description}</Text>
      {actionLabel && onAction ? (
        <Button mode="contained" onPress={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}
