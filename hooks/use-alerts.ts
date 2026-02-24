import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { repositories, queryKeys } from "@/db/repositories";

export function useAlerts(userId: string) {
  return useQuery({
    queryKey: queryKeys.alerts.all(userId),
    queryFn: () => repositories.health.getAlerts(userId),
    enabled: Boolean(userId),
  });
}

export function useMarkAlertReadMutation(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (alertId: string) => repositories.health.markRead(alertId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all(userId) });
    },
  });
}
