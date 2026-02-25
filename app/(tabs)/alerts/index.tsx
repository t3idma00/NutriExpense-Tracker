import { useMemo, useState } from "react";
import { View } from "react-native";
import { Button, Card, Chip, Text } from "react-native-paper";
import { Screen } from "@/components/layout/screen";
import { useAlerts, useMarkAlertReadMutation } from "@/hooks/use-alerts";
import { useCurrentUser } from "@/hooks/use-user";

const severityColor: Record<string, string> = {
  critical: "#B91C1C",
  high: "#DC2626",
  medium: "#D97706",
  low: "#2563EB",
};

export default function AlertsScreen() {
  const { data: user } = useCurrentUser();
  const alerts = useAlerts(user?.id ?? "");
  const markRead = useMarkAlertReadMutation(user?.id ?? "");
  const [filter, setFilter] = useState<"all" | "deficiency" | "excess" | "expiry_warning">(
    "all",
  );

  const filtered = useMemo(
    () =>
      (alerts.data ?? []).filter((alert) => (filter === "all" ? true : alert.alertType === filter)),
    [alerts.data, filter],
  );

  return (
    <Screen>
      <Text variant="headlineSmall">Smart Alerts</Text>
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        {["all", "deficiency", "excess", "expiry_warning"].map((option) => (
          <Chip key={option} selected={filter === option} onPress={() => setFilter(option as never)}>
            {option}
          </Chip>
        ))}
      </View>

      {filtered.map((alert) => (
        <Card key={alert.id}>
          <Card.Content style={{ gap: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontWeight: "700", color: severityColor[alert.severity] }}>
                {alert.severity.toUpperCase()}
              </Text>
              <Text style={{ color: "#6B7280" }}>
                {new Date(alert.triggeredAt).toLocaleDateString()}
              </Text>
            </View>
            <Text>{alert.message}</Text>
            <Text style={{ color: "#6B7280", fontSize: 12 }}>
              Current: {alert.currentValue ?? "-"} | Target: {alert.targetValue ?? "-"}
            </Text>
            {alert.isRead ? null : (
              <Button mode="text" onPress={() => markRead.mutate(alert.id)}>
                Mark as Read
              </Button>
            )}
          </Card.Content>
        </Card>
      ))}

      {!filtered.length ? (
        <Card>
          <Card.Content style={{ gap: 8 }}>
            <Text style={{ fontSize: 22 }}>All clear</Text>
            <Text style={{ color: "#6B7280" }}>
              No alerts right now. Your current nutrition and expiry signals look stable.
            </Text>
          </Card.Content>
        </Card>
      ) : null}
    </Screen>
  );
}
