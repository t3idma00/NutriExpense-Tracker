import { View } from "react-native";
import { Button, Text } from "react-native-paper";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View
      style={{
        padding: 20,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        backgroundColor: "#FFFFFF",
        gap: 10,
      }}
    >
      <Text variant="titleMedium">{title}</Text>
      <Text style={{ textAlign: "center", color: "#6B7280" }}>{description}</Text>
      {actionLabel && onAction ? <Button onPress={onAction}>{actionLabel}</Button> : null}
    </View>
  );
}
