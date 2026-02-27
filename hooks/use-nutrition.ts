import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { repositories, queryKeys } from "@/db/repositories";
import type { DailyNutritionLog, NutritionProfile } from "@/types";
import { runAlertEngine } from "@/modules/health/alert-engine";
import { buildUserTargets } from "@/utils/health-calculator";
import { useAppStore } from "@/store/app-store";
import { buildResolvedConsumptionLog } from "@/services/consumption-log.service";
import {
  recomputeConsumptionModels,
  recomputeNutritionAnalytics,
} from "@/services/nutrition-analytics.service";

export function useNutritionProfile(itemId: string) {
  return useQuery({
    queryKey: queryKeys.nutrition.byItem(itemId),
    queryFn: () => repositories.nutrition.getNutritionByItemId(itemId),
    enabled: Boolean(itemId),
  });
}

export function useNutritionAggregate(userId: string, from: number, to: number) {
  return useQuery({
    queryKey: queryKeys.nutrition.byRange(from, to, userId),
    queryFn: () => repositories.nutrition.aggregateByRange(userId, from, to),
    enabled: Boolean(userId),
  });
}

export function useRecentLogs(userId: string, from: number, to: number) {
  return useQuery({
    queryKey: ["nutrition", "logs", userId, from, to],
    queryFn: () => repositories.nutrition.recentLogs(userId, from, to),
    enabled: Boolean(userId),
  });
}

export function useUpsertNutritionMutation() {
  const queryClient = useQueryClient();
  const userId = useAppStore((s) => s.currentUserId);
  return useMutation({
    mutationFn: (
      profile: Omit<NutritionProfile, "id" | "createdAt"> & { id?: string },
    ) => repositories.nutrition.upsertNutritionProfile(profile),
    onSuccess: async (saved) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.nutrition.byItem(saved.expenseItemId),
      });
      void queryClient.invalidateQueries({ queryKey: ["nutrition", "range"] });
      if (userId) {
        const user = await repositories.user.getCurrentUser(userId);
        const targets = buildUserTargets(user ?? {});
        await recomputeNutritionAnalytics({ userId, targets });
        await recomputeConsumptionModels({ userId });
        void queryClient.invalidateQueries({ queryKey: queryKeys.analytics.latest(userId) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.analytics.models(userId) });
      }
    },
  });
}

export function useLogConsumptionMutation(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (log: Omit<DailyNutritionLog, "id" | "createdAt" | "userId">) => {
      const profile = await repositories.user.getCurrentUser(userId);
      const resolved = await buildResolvedConsumptionLog({
        userId,
        log,
      });
      const saved = await repositories.nutrition.logConsumption(resolved);
      const targets = buildUserTargets(profile ?? {});
      const analytics = await recomputeNutritionAnalytics({ userId, targets });
      await recomputeConsumptionModels({ userId });
      await runAlertEngine(userId, targets, analytics);
      return saved;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["nutrition"] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all(userId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.analytics.latest(userId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.analytics.models(userId) });
    },
  });
}
