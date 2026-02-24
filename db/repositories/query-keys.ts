export const queryKeys = {
  user: (userId?: string) => ["user", userId] as const,
  expenses: {
    all: ["expenses"] as const,
    list: (filters?: unknown) => ["expenses", "list", filters] as const,
    byId: (id: string) => ["expenses", "detail", id] as const,
    stats: (from: number, to: number) => ["expenses", "stats", from, to] as const,
  },
  nutrition: {
    byItem: (itemId: string) => ["nutrition", "item", itemId] as const,
    byRange: (from: number, to: number, userId?: string) =>
      ["nutrition", "range", from, to, userId] as const,
  },
  alerts: {
    all: (userId?: string) => ["alerts", userId] as const,
  },
};
