import { useMemo, useState } from "react";
import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { Button, Card, Chip, ProgressBar, Text, TextInput } from "react-native-paper";
import { Screen } from "@/components/layout/screen";
import { useCurrentUser, useUpdateUserMutation } from "@/hooks/use-user";
import { useAppStore } from "@/store/app-store";
import type { ActivityLevel, Gender, HealthGoal } from "@/types";

const steps = ["Personal", "Metrics", "Activity", "Goals", "Diet"] as const;
const activityOptions: ActivityLevel[] = [
  "sedentary",
  "light",
  "moderate",
  "active",
  "very_active",
];
const goalsOptions: HealthGoal[] = [
  "weight_loss",
  "muscle_gain",
  "maintenance",
  "improve_energy",
  "better_nutrition",
];

export default function OnboardingScreen() {
  const { data: user } = useCurrentUser();
  const updateUser = useUpdateUserMutation();
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const [step, setStep] = useState(0);

  const [name, setName] = useState(user?.name ?? "");
  const [age, setAge] = useState(String(user?.age ?? ""));
  const [gender, setGender] = useState<Gender>(user?.gender ?? "female");
  const [weight, setWeight] = useState(String(user?.weightKg ?? ""));
  const [height, setHeight] = useState(String(user?.heightCm ?? ""));
  const [activity, setActivity] = useState<ActivityLevel>(user?.activityLevel ?? "moderate");
  const [goals, setGoals] = useState<HealthGoal[]>(user?.healthGoals ?? ["better_nutrition"]);
  const [dietaryRestrictions, setDietaryRestrictions] = useState(
    user?.dietaryRestrictions?.join(", ") ?? "",
  );

  const canNext = useMemo(() => {
    if (step === 0) return name.trim().length > 1 && age.trim().length > 0;
    if (step === 1) return weight.trim().length > 0 && height.trim().length > 0;
    return true;
  }, [step, name, age, weight, height]);

  const onNext = async () => {
    if (step < steps.length - 1) {
      setStep((s) => s + 1);
      return;
    }

    await updateUser.mutateAsync({
      name: name.trim(),
      age: Number(age),
      gender,
      weightKg: Number(weight),
      heightCm: Number(height),
      activityLevel: activity,
      healthGoals: goals,
      dietaryRestrictions: dietaryRestrictions
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      onboardingCompleted: true,
    });
    completeOnboarding();
    router.replace("/(tabs)");
  };

  const toggleGoal = (goal: HealthGoal) => {
    if (goals.includes(goal)) {
      setGoals((prev) => prev.filter((entry) => entry !== goal));
      return;
    }
    setGoals((prev) => [...prev, goal]);
  };

  return (
    <Screen>
      <Text variant="headlineSmall">SmartSpendAI Health Setup</Text>
      <Text style={{ color: "#6B7280" }}>Step {step + 1} of {steps.length}: {steps[step]}</Text>
      <ProgressBar progress={(step + 1) / steps.length} />

      {step === 0 ? (
        <Card>
          <Card.Content style={{ gap: 12 }}>
            <TextInput label="Name" value={name} onChangeText={setName} />
            <TextInput
              label="Age"
              keyboardType="numeric"
              value={age}
              onChangeText={setAge}
            />
            <View style={{ flexDirection: "row", gap: 8 }}>
              {(["female", "male", "other"] as Gender[]).map((option) => (
                <Chip
                  key={option}
                  selected={gender === option}
                  onPress={() => setGender(option)}
                >
                  {option}
                </Chip>
              ))}
            </View>
          </Card.Content>
        </Card>
      ) : null}

      {step === 1 ? (
        <Card>
          <Card.Content style={{ gap: 12 }}>
            <TextInput
              label="Weight (kg)"
              keyboardType="decimal-pad"
              value={weight}
              onChangeText={setWeight}
            />
            <TextInput
              label="Height (cm)"
              keyboardType="decimal-pad"
              value={height}
              onChangeText={setHeight}
            />
          </Card.Content>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card>
          <Card.Content style={{ gap: 10 }}>
            {activityOptions.map((option) => (
              <Pressable key={option} onPress={() => setActivity(option)}>
                <Chip selected={activity === option}>{option}</Chip>
              </Pressable>
            ))}
          </Card.Content>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card>
          <Card.Content style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {goalsOptions.map((goal) => (
                <Chip key={goal} selected={goals.includes(goal)} onPress={() => toggleGoal(goal)}>
                  {goal.replace("_", " ")}
                </Chip>
              ))}
            </View>
          </Card.Content>
        </Card>
      ) : null}

      {step === 4 ? (
        <Card>
          <Card.Content>
            <TextInput
              label="Dietary Restrictions (comma separated)"
              value={dietaryRestrictions}
              onChangeText={setDietaryRestrictions}
            />
          </Card.Content>
        </Card>
      ) : null}

      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Button mode="text" disabled={step === 0} onPress={() => setStep((s) => s - 1)}>
          Back
        </Button>
        <Button mode="contained" disabled={!canNext || updateUser.isPending} onPress={onNext}>
          {step === steps.length - 1 ? "Finish" : "Continue"}
        </Button>
      </View>
    </Screen>
  );
}
