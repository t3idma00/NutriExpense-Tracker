import { ExpenseRepository } from "@/db/repositories/expense-repository";
import { NutritionRepository } from "@/db/repositories/nutrition-repository";
import { HealthRepository } from "@/db/repositories/health-repository";
import { UserRepository } from "@/db/repositories/user-repository";
import { HouseholdRepository } from "@/db/repositories/household-repository";
import { AnalyticsRepository } from "@/db/repositories/analytics-repository";
import { CatalogRepository } from "@/db/repositories/catalog-repository";

export const repositories = {
  expense: new ExpenseRepository(),
  nutrition: new NutritionRepository(),
  health: new HealthRepository(),
  user: new UserRepository(),
  household: new HouseholdRepository(),
  analytics: new AnalyticsRepository(),
  catalog: new CatalogRepository(),
};

export * from "./query-keys";
