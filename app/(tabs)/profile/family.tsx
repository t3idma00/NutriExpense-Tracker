import { useEffect, useState } from "react";
import { View } from "react-native";
import { Button, Card, Chip, Snackbar, Text, TextInput } from "react-native-paper";
import { Screen } from "@/components/layout/screen";
import {
  useDeactivateFamilyMemberMutation,
  useFamilyMembers,
  useHouseholdProfile,
  useUpsertFamilyMemberMutation,
  useUpdateHouseholdMutation,
} from "@/hooks/use-household";
import type { FamilyRole, Gender } from "@/types";

const roles: FamilyRole[] = ["mother", "father", "child", "grandparent", "guardian", "other"];

export default function FamilyProfileScreen() {
  const household = useHouseholdProfile();
  const members = useFamilyMembers();
  const updateHousehold = useUpdateHouseholdMutation();
  const upsertMember = useUpsertFamilyMemberMutation();
  const removeMember = useDeactivateFamilyMemberMutation();

  const [householdName, setHouseholdName] = useState(household.data?.name ?? "My Household");
  const [newName, setNewName] = useState("");
  const [newAge, setNewAge] = useState("");
  const [newRole, setNewRole] = useState<FamilyRole>("other");
  const [newGender, setNewGender] = useState<Gender>("other");
  const [status, setStatus] = useState<string>();

  useEffect(() => {
    if (household.data?.name) {
      setHouseholdName(household.data.name);
    }
  }, [household.data?.name]);

  const saveHousehold = async () => {
    if (!householdName.trim()) return;
    await updateHousehold.mutateAsync({ name: householdName.trim() });
    setStatus("Household profile updated.");
  };

  const addMember = async () => {
    if (!newName.trim()) {
      setStatus("Member name is required.");
      return;
    }
    await upsertMember.mutateAsync({
      name: newName.trim(),
      age: newAge ? Number(newAge) : undefined,
      role: newRole,
      gender: newGender,
      isSchoolAge: newRole === "child",
    });
    setNewName("");
    setNewAge("");
    setStatus("Family member added.");
  };

  return (
    <Screen>
      <Text variant="headlineSmall">Family Profile</Text>
      <Text style={{ color: "#6B7280" }}>
        Manage household members so SmartSpendAI can personalize nutrition and alerts.
      </Text>

      <Card>
        <Card.Content style={{ gap: 10 }}>
          <Text variant="titleMedium">Household</Text>
          <TextInput label="Household Name" value={householdName} onChangeText={setHouseholdName} />
          <Text style={{ color: "#6B7280" }}>Members: {members.data?.length ?? 0}</Text>
          <Button mode="contained-tonal" onPress={saveHousehold} loading={updateHousehold.isPending}>
            Save Household
          </Button>
        </Card.Content>
      </Card>

      <Card>
        <Card.Content style={{ gap: 10 }}>
          <Text variant="titleMedium">Add Member</Text>
          <TextInput label="Name" value={newName} onChangeText={setNewName} />
          <TextInput
            label="Age"
            value={newAge}
            onChangeText={setNewAge}
            keyboardType="numeric"
          />
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {roles.map((role) => (
              <Chip key={role} selected={newRole === role} onPress={() => setNewRole(role)}>
                {role}
              </Chip>
            ))}
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {(["female", "male", "other"] as Gender[]).map((gender) => (
              <Chip key={gender} selected={newGender === gender} onPress={() => setNewGender(gender)}>
                {gender}
              </Chip>
            ))}
          </View>
          <Button mode="contained" onPress={addMember} loading={upsertMember.isPending}>
            Add Member
          </Button>
        </Card.Content>
      </Card>

      <Card>
        <Card.Content style={{ gap: 8 }}>
          <Text variant="titleMedium">Active Members</Text>
          {(members.data ?? []).map((member) => (
            <View
              key={member.id}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottomWidth: 1,
                borderColor: "#F3F4F6",
                paddingBottom: 8,
              }}
            >
              <View>
                <Text style={{ fontWeight: "700" }}>{member.name}</Text>
                <Text style={{ color: "#6B7280", fontSize: 12 }}>
                  {member.role ?? "member"} | Age {member.age ?? "-"}
                </Text>
              </View>
              <Button mode="text" onPress={() => removeMember.mutate(member.id)}>
                Remove
              </Button>
            </View>
          ))}
          {!members.data?.length ? (
            <Text style={{ color: "#6B7280" }}>
              No members yet. Add at least one member to enable household insights.
            </Text>
          ) : null}
        </Card.Content>
      </Card>

      <Snackbar visible={Boolean(status)} onDismiss={() => setStatus(undefined)} duration={1800}>
        {status}
      </Snackbar>
    </Screen>
  );
}
