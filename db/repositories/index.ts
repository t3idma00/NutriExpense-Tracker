import { ExpenseRepository } from "@/db/repositories/expense-repository";
import { NutritionRepository } from "@/db/repositories/nutrition-repository";
import { HealthRepository } from "@/db/repositories/health-repository";
import { UserRepository } from "@/db/repositories/user-repository";
import { HouseholdRepository } from "@/db/repositories/household-repository";

export const repositories = {
  expense: new ExpenseRepository(),
  nutrition: new NutritionRepository(),
  health: new HealthRepository(),
  user: new UserRepository(),
  household: new HouseholdRepository(),
};

export * from "./query-keys";
