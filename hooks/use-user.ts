import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { repositories, queryKeys } from "@/db/repositories";
import { useAppStore } from "@/store/app-store";
import type { UserProfile } from "@/types";

export function useCurrentUser() {
  const currentUserId = useAppStore((s) => s.currentUserId);
  return useQuery({
    queryKey: queryKeys.user(currentUserId),
    queryFn: () => repositories.user.getCurrentUser(currentUserId),
    enabled: true,
  });
}

export function useUpdateUserMutation() {
  const queryClient = useQueryClient();
  const currentUserId = useAppStore((s) => s.currentUserId);
  return useMutation({
    mutationFn: (patch: Partial<UserProfile>) => {
      if (!currentUserId) {
        throw new Error("No active user found.");
      }
      return repositories.user.updateProfile(currentUserId, patch);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.user(currentUserId) });
    },
  });
}
