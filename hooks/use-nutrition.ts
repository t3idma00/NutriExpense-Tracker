import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { repositories, queryKeys } from "@/db/repositories";
import type { DailyNutritionLog, NutritionProfile } from "@/types";
import { runAlertEngine } from "@/modules/health/alert-engine";
import { buildUserTargets } from "@/utils/health-calculator";

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
  return useMutation({
    mutationFn: (
      profile: Omit<NutritionProfile, "id" | "createdAt"> & { id?: string },
    ) => repositories.nutrition.upsertNutritionProfile(profile),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.nutrition.byItem(saved.expenseItemId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.nutrition.byRange(0, 0) });
    },
  });
}

export function useLogConsumptionMutation(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (log: Omit<DailyNutritionLog, "id" | "createdAt" | "userId">) => {
      const profile = await repositories.user.getCurrentUser(userId);
      const saved = await repositories.nutrition.logConsumption({
        ...log,
        userId,
      });
      await runAlertEngine(userId, buildUserTargets(profile ?? {}));
      return saved;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["nutrition"] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all(userId) });
    },
  });
}
