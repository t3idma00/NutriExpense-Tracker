import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { repositories, queryKeys } from "@/db/repositories";
import type { ParsedReceipt } from "@/types";

export function useExpenses(filters?: Parameters<typeof repositories.expense.listItems>[0]) {
  return useQuery({
    queryKey: queryKeys.expenses.list(filters),
    queryFn: () => repositories.expense.listItems(filters),
  });
}

export function useExpense(id: string) {
  return useQuery({
    queryKey: queryKeys.expenses.byId(id),
    queryFn: () => repositories.expense.getItemById(id),
    enabled: Boolean(id),
  });
}

export function useExpenseSummary(from: number, to: number) {
  return useQuery({
    queryKey: queryKeys.expenses.stats(from, to),
    queryFn: () => repositories.expense.summary(from, to),
  });
}

export function useCategorySpend(from: number, to: number) {
  return useQuery({
    queryKey: ["expenses", "category-spend", from, to],
    queryFn: () => repositories.expense.monthlySpendByCategory(from, to),
  });
}

export function useSaveReceiptMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { parsed: ParsedReceipt; imageUri: string }) =>
      repositories.expense.createReceiptWithItems({
        parsed: input.parsed,
        imageUri: input.imageUri,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all });
    },
  });
}

export function useDeleteExpenseMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repositories.expense.deleteItem(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all });
    },
  });
}
