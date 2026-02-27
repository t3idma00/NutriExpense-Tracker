import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys, repositories } from "@/db/repositories";
import { useAppStore } from "@/store/app-store";
import { buildUserTargets } from "@/utils/health-calculator";
import {
  recomputeConsumptionModels,
  recomputeNutritionAnalytics,
} from "@/services/nutrition-analytics.service";

export function useLatestAnalyticsSnapshot() {
  const userId = useAppStore((s) => s.currentUserId);
  return useQuery({
    queryKey: queryKeys.analytics.latest(userId),
    queryFn: () => repositories.analytics.getLatestSnapshot(userId ?? ""),
    enabled: Boolean(userId),
  });
}

export function useConsumptionModels(limit = 25) {
  const userId = useAppStore((s) => s.currentUserId);
  return useQuery({
    queryKey: queryKeys.analytics.models(userId),
    queryFn: () => repositories.analytics.listTopConsumptionModels(userId ?? "", limit),
    enabled: Boolean(userId),
  });
}

export function useRecomputeAnalyticsMutation() {
  const queryClient = useQueryClient();
  const userId = useAppStore((s) => s.currentUserId);
  return useMutation({
    mutationFn: async () => {
      if (!userId) return null;
      const user = await repositories.user.getCurrentUser(userId);
      const targets = buildUserTargets(user ?? {});
      const snapshot = await recomputeNutritionAnalytics({
        userId,
        targets,
      });
      await recomputeConsumptionModels({ userId });
      return snapshot;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.analytics.latest(userId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.analytics.models(userId) });
    },
  });
}
