import { getDb } from "@/db/database";
import type { UserProfile } from "@/types";
import { createId } from "@/utils/id";

function mapUser(row: Record<string, unknown>): UserProfile {
  return {
    id: String(row.id),
    name: String(row.name),
    email: row.email ? String(row.email) : undefined,
    avatarUri: row.avatar_uri ? String(row.avatar_uri) : undefined,
    weightKg: typeof row.weight_kg === "number" ? row.weight_kg : undefined,
    heightCm: typeof row.height_cm === "number" ? row.height_cm : undefined,
    age: typeof row.age === "number" ? row.age : undefined,
    gender: row.gender ? (String(row.gender) as UserProfile["gender"]) : undefined,
    activityLevel: row.activity_level
      ? (String(row.activity_level) as UserProfile["activityLevel"])
      : undefined,
    healthGoals: JSON.parse(String(row.health_goals ?? "[]")),
    dietaryRestrictions: JSON.parse(String(row.dietary_restrictions ?? "[]")),
    preferredLanguage: String(row.preferred_language ?? "en"),
    onboardingCompleted: Number(row.onboarding_completed ?? 0) === 1,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

export class UserRepository {
  async getCurrentUser(userId?: string): Promise<UserProfile | null> {
    const db = await getDb();
    if (userId) {
      const row = await db.getFirstAsync<Record<string, unknown>>(
        "SELECT * FROM users WHERE id = ? LIMIT 1",
        [userId],
      );
      return row ? mapUser(row) : null;
    }

    const row = await db.getFirstAsync<Record<string, unknown>>(
      "SELECT * FROM users ORDER BY created_at ASC LIMIT 1",
    );
    return row ? mapUser(row) : null;
  }

  async createDefaultUser(name: string): Promise<UserProfile> {
    const now = Date.now();
    const profile: UserProfile = {
      id: createId(),
      name,
      healthGoals: ["better_nutrition"],
      dietaryRestrictions: [],
      preferredLanguage: "en",
      onboardingCompleted: false,
      createdAt: now,
      updatedAt: now,
    };

    await this.saveProfile(profile);
    return profile;
  }

  async saveProfile(profile: UserProfile): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO users (
        id, name, email, avatar_uri, weight_kg, height_cm, age, gender, activity_level,
        health_goals, dietary_restrictions, preferred_language, onboarding_completed, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        profile.id,
        profile.name,
        profile.email ?? null,
        profile.avatarUri ?? null,
        profile.weightKg ?? null,
        profile.heightCm ?? null,
        profile.age ?? null,
        profile.gender ?? null,
        profile.activityLevel ?? null,
        JSON.stringify(profile.healthGoals),
        JSON.stringify(profile.dietaryRestrictions),
        profile.preferredLanguage,
        profile.onboardingCompleted ? 1 : 0,
        profile.createdAt,
        profile.updatedAt,
      ],
    );
  }

  async updateProfile(
    userId: string,
    patch: Partial<UserProfile>,
  ): Promise<UserProfile | null> {
    const existing = await this.getCurrentUser(userId);
    if (!existing) return null;

    const merged: UserProfile = {
      ...existing,
      ...patch,
      id: existing.id,
      updatedAt: Date.now(),
    };

    await this.saveProfile(merged);
    return merged;
  }
}
