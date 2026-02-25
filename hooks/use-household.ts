import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys, repositories } from "@/db/repositories";
import { useAppStore } from "@/store/app-store";
import type { FamilyMember, HouseholdProfile } from "@/types";

export function useHouseholdProfile() {
  const userId = useAppStore((s) => s.currentUserId);
  return useQuery({
    queryKey: queryKeys.household.profile(userId),
    queryFn: () => repositories.household.getHouseholdByUserId(userId ?? ""),
    enabled: Boolean(userId),
  });
}

export function useFamilyMembers() {
  const userId = useAppStore((s) => s.currentUserId);
  return useQuery({
    queryKey: queryKeys.household.members(userId),
    queryFn: () => repositories.household.listMembersByUserId(userId ?? ""),
    enabled: Boolean(userId),
  });
}

export function useUpdateHouseholdMutation() {
  const queryClient = useQueryClient();
  const userId = useAppStore((s) => s.currentUserId);
  return useMutation({
    mutationFn: (
      patch: Partial<Pick<HouseholdProfile, "name" | "mealsPerDay" | "groceryFrequency">>,
    ) => repositories.household.updateHousehold(userId ?? "", patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.household.profile(userId) });
    },
  });
}

export function useUpsertFamilyMemberMutation() {
  const queryClient = useQueryClient();
  const userId = useAppStore((s) => s.currentUserId);
  return useMutation({
    mutationFn: (member: Partial<FamilyMember> & { name: string }) =>
      repositories.household.upsertMember(userId ?? "", member),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.household.members(userId) });
    },
  });
}

export function useDeactivateFamilyMemberMutation() {
  const queryClient = useQueryClient();
  const userId = useAppStore((s) => s.currentUserId);
  return useMutation({
    mutationFn: (memberId: string) => repositories.household.deactivateMember(memberId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.household.members(userId) });
    },
  });
}
