import type { ExpenseCategory } from "@/types";

export interface CategoryMeta {
  key: ExpenseCategory;
  label: string;
  icon: string;
  color: string;
}

export const EXPENSE_CATEGORIES: CategoryMeta[] = [
  { key: "grocery", label: "Grocery", icon: "cart", color: "#1A56DB" },
  { key: "produce", label: "Produce", icon: "leaf", color: "#10B981" },
  { key: "bakery", label: "Bakery", icon: "bread-slice", color: "#D97706" },
  {
    key: "household",
    label: "Household",
    icon: "home-variant",
    color: "#4B5563",
  },
  { key: "pharmacy", label: "Pharmacy", icon: "pill", color: "#EF4444" },
  {
    key: "restaurant",
    label: "Restaurant",
    icon: "silverware-fork-knife",
    color: "#7C3AED",
  },
  {
    key: "personal_care",
    label: "Personal Care",
    icon: "account-heart",
    color: "#EC4899",
  },
  {
    key: "electronics",
    label: "Electronics",
    icon: "cellphone",
    color: "#0EA5E9",
  },
  { key: "clothing", label: "Clothing", icon: "hanger", color: "#F59E0B" },
  { key: "other", label: "Other", icon: "dots-horizontal", color: "#6B7280" },
];

export function getCategoryMeta(category: ExpenseCategory): CategoryMeta {
  return (
    EXPENSE_CATEGORIES.find((c) => c.key === category) ??
    EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1]
  );
}
