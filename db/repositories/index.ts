import { ExpenseRepository } from "@/db/repositories/expense-repository";
import { NutritionRepository } from "@/db/repositories/nutrition-repository";
import { HealthRepository } from "@/db/repositories/health-repository";
import { UserRepository } from "@/db/repositories/user-repository";

export const repositories = {
  expense: new ExpenseRepository(),
  nutrition: new NutritionRepository(),
  health: new HealthRepository(),
  user: new UserRepository(),
};

export * from "./query-keys";
