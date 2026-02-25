import { getDb } from "@/db/database";
import type { FamilyMember, HouseholdProfile } from "@/types";
import { createId } from "@/utils/id";

function mapHousehold(row: Record<string, unknown>): HouseholdProfile {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    name: String(row.name ?? "My Household"),
    mealsPerDay: Number(row.meals_per_day ?? 3),
    groceryFrequency: String(row.grocery_frequency ?? "weekly") as HouseholdProfile["groceryFrequency"],
    createdAt: Number(row.created_at ?? Date.now()),
    updatedAt: Number(row.updated_at ?? Date.now()),
  };
}

function mapMember(row: Record<string, unknown>): FamilyMember {
  return {
    id: String(row.id),
    householdId: String(row.household_id),
    name: String(row.name),
    role: row.role ? (String(row.role) as FamilyMember["role"]) : undefined,
    age: typeof row.age === "number" ? row.age : undefined,
    gender: row.gender ? (String(row.gender) as FamilyMember["gender"]) : undefined,
    weightKg: typeof row.weight_kg === "number" ? row.weight_kg : undefined,
    heightCm: typeof row.height_cm === "number" ? row.height_cm : undefined,
    isSchoolAge: Number(row.is_school_age ?? 0) === 1,
    isActive: Number(row.is_active ?? 1) === 1,
    rdaProfileKey: row.rda_profile_key ? String(row.rda_profile_key) : undefined,
    rdaTargets: JSON.parse(String(row.rda_targets ?? "{}")) as FamilyMember["rdaTargets"],
    createdAt: Number(row.created_at ?? Date.now()),
    updatedAt: Number(row.updated_at ?? Date.now()),
  };
}

export class HouseholdRepository {
  async ensureDefaultHouseholdForUser(userId: string, userName: string): Promise<HouseholdProfile> {
    const existing = await this.getHouseholdByUserId(userId);
    if (existing) return existing;

    const now = Date.now();
    const household: HouseholdProfile = {
      id: createId(),
      userId,
      name: "My Household",
      mealsPerDay: 3,
      groceryFrequency: "weekly",
      createdAt: now,
      updatedAt: now,
    };

    const member: FamilyMember = {
      id: createId(),
      householdId: household.id,
      name: userName || "Primary Member",
      role: "other",
      isSchoolAge: false,
      isActive: true,
      rdaTargets: {},
      createdAt: now,
      updatedAt: now,
    };

    const db = await getDb();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO household_profiles (
          id, user_id, name, meals_per_day, grocery_frequency, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          household.id,
          household.userId,
          household.name,
          household.mealsPerDay,
          household.groceryFrequency,
          household.createdAt,
          household.updatedAt,
        ],
      );

      await db.runAsync(
        `INSERT INTO family_members (
          id, household_id, name, role, age, gender, weight_kg, height_cm, is_school_age,
          is_active, rda_profile_key, rda_targets, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          member.id,
          member.householdId,
          member.name,
          member.role ?? null,
          member.age ?? null,
          member.gender ?? null,
          member.weightKg ?? null,
          member.heightCm ?? null,
          member.isSchoolAge ? 1 : 0,
          member.isActive ? 1 : 0,
          member.rdaProfileKey ?? null,
          JSON.stringify(member.rdaTargets),
          member.createdAt,
          member.updatedAt,
        ],
      );
    });

    return household;
  }

  async getHouseholdByUserId(userId: string): Promise<HouseholdProfile | null> {
    const db = await getDb();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      "SELECT * FROM household_profiles WHERE user_id = ? LIMIT 1",
      [userId],
    );
    return row ? mapHousehold(row) : null;
  }

  async updateHousehold(
    userId: string,
    patch: Partial<Pick<HouseholdProfile, "name" | "mealsPerDay" | "groceryFrequency">>,
  ): Promise<HouseholdProfile | null> {
    const existing = await this.getHouseholdByUserId(userId);
    if (!existing) return null;

    const next: HouseholdProfile = {
      ...existing,
      ...patch,
      updatedAt: Date.now(),
    };

    const db = await getDb();
    await db.runAsync(
      `UPDATE household_profiles
       SET name = ?, meals_per_day = ?, grocery_frequency = ?, updated_at = ?
       WHERE id = ?`,
      [next.name, next.mealsPerDay, next.groceryFrequency, next.updatedAt, next.id],
    );
    return next;
  }

  async listMembersByUserId(userId: string): Promise<FamilyMember[]> {
    const household = await this.getHouseholdByUserId(userId);
    if (!household) return [];

    const db = await getDb();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM family_members
       WHERE household_id = ? AND is_active = 1
       ORDER BY created_at ASC`,
      [household.id],
    );
    return rows.map(mapMember);
  }

  async upsertMember(
    userId: string,
    member: Partial<FamilyMember> & { name: string },
  ): Promise<FamilyMember | null> {
    const household = await this.getHouseholdByUserId(userId);
    if (!household) return null;

    const now = Date.now();
    const next: FamilyMember = {
      id: member.id ?? createId(),
      householdId: household.id,
      name: member.name,
      role: member.role,
      age: member.age,
      gender: member.gender,
      weightKg: member.weightKg,
      heightCm: member.heightCm,
      isSchoolAge: member.isSchoolAge ?? false,
      isActive: member.isActive ?? true,
      rdaProfileKey: member.rdaProfileKey,
      rdaTargets: member.rdaTargets ?? {},
      createdAt: member.createdAt ?? now,
      updatedAt: now,
    };

    const db = await getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO family_members (
        id, household_id, name, role, age, gender, weight_kg, height_cm, is_school_age, is_active,
        rda_profile_key, rda_targets, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        next.id,
        next.householdId,
        next.name,
        next.role ?? null,
        next.age ?? null,
        next.gender ?? null,
        next.weightKg ?? null,
        next.heightCm ?? null,
        next.isSchoolAge ? 1 : 0,
        next.isActive ? 1 : 0,
        next.rdaProfileKey ?? null,
        JSON.stringify(next.rdaTargets),
        next.createdAt,
        next.updatedAt,
      ],
    );

    return next;
  }

  async deactivateMember(memberId: string): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      "UPDATE family_members SET is_active = 0, updated_at = ? WHERE id = ?",
      [Date.now(), memberId],
    );
  }
}
