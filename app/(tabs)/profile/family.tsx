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
      <Card style={{ borderRadius: 22, backgroundColor: "#EDF3FB" }}>
        <Card.Content style={{ gap: 8 }}>
          <Text variant="headlineSmall" style={{ fontWeight: "800", color: "#153A5E" }}>
            Family profile
          </Text>
          <Text style={{ color: "#5B6F84" }}>
            Manage household members to personalize nutrition and alerts.
          </Text>
        </Card.Content>
      </Card>

      <Card style={{ borderRadius: 20, backgroundColor: "#F8FAFD" }}>
        <Card.Content style={{ gap: 10 }}>
          <Text variant="titleMedium" style={{ fontWeight: "800", color: "#173D62" }}>
            Household
          </Text>
          <TextInput label="Household name" value={householdName} onChangeText={setHouseholdName} />
          <Text style={{ color: "#60748C" }}>Members: {members.data?.length ?? 0}</Text>
          <Button mode="contained-tonal" onPress={saveHousehold} loading={updateHousehold.isPending}>
            Save household
          </Button>
        </Card.Content>
      </Card>

      <Card style={{ borderRadius: 20, backgroundColor: "#F8FAFD" }}>
        <Card.Content style={{ gap: 10 }}>
          <Text variant="titleMedium" style={{ fontWeight: "800", color: "#173D62" }}>
            Add member
          </Text>
          <TextInput label="Name" value={newName} onChangeText={setNewName} />
          <TextInput label="Age" value={newAge} onChangeText={setNewAge} keyboardType="numeric" />

          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {roles.map((role) => (
              <Chip key={role} selected={newRole === role} onPress={() => setNewRole(role)}>
                {role}
              </Chip>
            ))}
          </View>

          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {(["female", "male", "other"] as Gender[]).map((gender) => (
              <Chip key={gender} selected={newGender === gender} onPress={() => setNewGender(gender)}>
                {gender}
              </Chip>
            ))}
          </View>

          <Button mode="contained" onPress={addMember} loading={upsertMember.isPending}>
            Add member
          </Button>
        </Card.Content>
      </Card>

      <Card style={{ borderRadius: 20, backgroundColor: "#F6FAFD" }}>
        <Card.Content style={{ gap: 8 }}>
          <Text variant="titleMedium" style={{ fontWeight: "800", color: "#173D62" }}>
            Active members
          </Text>

          {(members.data ?? []).map((member) => (
            <View
              key={member.id}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottomWidth: 1,
                borderColor: "#E4EAF2",
                paddingBottom: 8,
              }}
            >
              <View>
                <Text style={{ fontWeight: "700", color: "#22364B" }}>{member.name}</Text>
                <Text style={{ color: "#60748C", fontSize: 12 }}>
                  {member.role ?? "member"} | age {member.age ?? "-"}
                </Text>
              </View>
              <Button mode="text" onPress={() => removeMember.mutate(member.id)}>
                Remove
              </Button>
            </View>
          ))}

          {!members.data?.length ? (
            <Text style={{ color: "#60748C" }}>
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
