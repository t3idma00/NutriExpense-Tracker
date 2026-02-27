import { useMemo, useState } from "react";
import { View } from "react-native";
import { Button, Card, Chip, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Screen } from "@/components/layout/screen";
import { EmptyState } from "@/components/ui/empty-state";
import { useAlerts, useMarkAlertReadMutation } from "@/hooks/use-alerts";
import { useCurrentUser } from "@/hooks/use-user";

const severityMeta: Record<
  string,
  { fg: string; bg: string; icon: string }
> = {
  critical: { fg: "#8D2E3A", bg: "#F8E2E6", icon: "alert-octagon" },
  high: { fg: "#A33F2A", bg: "#FBE7DE", icon: "alert" },
  medium: { fg: "#8A5A1F", bg: "#F6EBD8", icon: "alert-outline" },
  low: { fg: "#1F4E82", bg: "#DFEAF8", icon: "information-outline" },
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
      (alerts.data ?? []).filter((alert) =>
        filter === "all" ? true : alert.alertType === filter,
      ),
    [alerts.data, filter],
  );

  return (
    <Screen>
      <Card style={{ borderRadius: 22, backgroundColor: "#EDF3FB" }}>
        <Card.Content style={{ gap: 8 }}>
          <Text variant="headlineSmall" style={{ fontWeight: "800", color: "#153A5E" }}>
            Smart alerts
          </Text>
          <Text style={{ color: "#5B6F84" }}>
            High-priority nutrition and expiry signals are listed here for quick action.
          </Text>
        </Card.Content>
      </Card>

      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        {[
          { key: "all", label: "All" },
          { key: "deficiency", label: "Deficiency" },
          { key: "excess", label: "Excess" },
          { key: "expiry_warning", label: "Expiry" },
        ].map((option) => (
          <Chip
            key={option.key}
            selected={filter === option.key}
            onPress={() => setFilter(option.key as never)}
            style={{ backgroundColor: filter === option.key ? "#DFEAF8" : "#EEF2F8" }}
          >
            {option.label}
          </Chip>
        ))}
      </View>

      {filtered.map((alert) => {
        const meta = severityMeta[alert.severity] ?? severityMeta.low;
        return (
          <Card key={alert.id} style={{ borderRadius: 18, backgroundColor: "#F7FAFF" }}>
            <Card.Content style={{ gap: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View
                  style={{
                    borderRadius: 999,
                    backgroundColor: meta.bg,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <MaterialCommunityIcons name={meta.icon as never} size={14} color={meta.fg} />
                  <Text style={{ fontWeight: "700", color: meta.fg }}>{alert.severity.toUpperCase()}</Text>
                </View>
                <Text style={{ color: "#62778E", fontSize: 12 }}>
                  {new Date(alert.triggeredAt).toLocaleDateString()}
                </Text>
              </View>

              <Text style={{ color: "#24384F", fontWeight: "600" }}>{alert.message}</Text>

              <Text style={{ color: "#62778E", fontSize: 12 }}>
                Current: {alert.currentValue ?? "-"} | Target: {alert.targetValue ?? "-"}
              </Text>

              {alert.isRead ? (
                <View
                  style={{
                    borderRadius: 999,
                    backgroundColor: "#E8F2EA",
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    alignSelf: "flex-start",
                  }}
                >
                  <Text style={{ color: "#2F6F57", fontSize: 12, fontWeight: "700" }}>
                    reviewed
                  </Text>
                </View>
              ) : (
                <Button mode="contained-tonal" onPress={() => markRead.mutate(alert.id)}>
                  Mark as read
                </Button>
              )}
            </Card.Content>
          </Card>
        );
      })}

      {!filtered.length ? (
        <EmptyState
          icon="check-decagram-outline"
          title="All clear"
          description="No alerts right now. Current nutrition and expiry signals look stable."
          previewLines={["calcium gap - resolved", "expiry warnings - none"]}
        />
      ) : null}
    </Screen>
  );
}
