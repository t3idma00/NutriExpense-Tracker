import { useMemo, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { Button, Card, Chip, ProgressBar, Text, TextInput } from "react-native-paper";
import { Screen } from "@/components/layout/screen";
import { useExpenses } from "@/hooks/use-expenses";
import { useCurrentUser, useUpdateUserMutation } from "@/hooks/use-user";
import { useAppStore } from "@/store/app-store";
import type { HealthGoal } from "@/types";

const steps = ["Profile", "First Value", "Targets"] as const;

const goalMap: Record<"lose_weight" | "eat_healthier" | "track_spending", HealthGoal> = {
  lose_weight: "weight_loss",
  eat_healthier: "better_nutrition",
  track_spending: "maintenance",
};

export default function OnboardingScreen() {
  const { data: user } = useCurrentUser();
  const updateUser = useUpdateUserMutation();
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const firstExpense = useExpenses({ limit: 1 });

  const [step, setStep] = useState(0);
  const [name, setName] = useState(user?.name ?? "");
  const [goal, setGoal] = useState<keyof typeof goalMap>("eat_healthier");
  const [weight, setWeight] = useState(String(user?.weightKg ?? ""));
  const [height, setHeight] = useState(String(user?.heightCm ?? ""));

  const hasScannedReceipt = (firstExpense.data?.length ?? 0) > 0;
  const canContinue = useMemo(() => {
    if (step === 0) return name.trim().length > 1;
    if (step === 1) return hasScannedReceipt;
    return true;
  }, [step, name, hasScannedReceipt]);

  const saveStepOne = async () => {
    await updateUser.mutateAsync({
      name: name.trim(),
      healthGoals: [goalMap[goal]],
      onboardingCompleted: false,
    });
  };

  const finish = async () => {
    await updateUser.mutateAsync({
      weightKg: weight.trim() ? Number(weight) : undefined,
      heightCm: height.trim() ? Number(height) : undefined,
      onboardingCompleted: true,
    });
    completeOnboarding();
    router.replace("/(tabs)");
  };

  const onContinue = async () => {
    if (step === 0) {
      await saveStepOne();
      setStep(1);
      return;
    }
    if (step === 1) {
      if (!hasScannedReceipt) {
        router.push("/(tabs)/scan/receipt");
        return;
      }
      setStep(2);
      return;
    }
    await finish();
  };

  return (
    <Screen>
      <Card style={{ borderRadius: 22, backgroundColor: "#EDF3FB" }}>
        <Card.Content style={{ gap: 8 }}>
          <Text variant="headlineSmall" style={{ fontWeight: "800", color: "#153A5E" }}>
            SmartSpendAI quick setup
          </Text>
          <Text style={{ color: "#5B6F84" }}>
            Step {step + 1} of {steps.length}: {steps[step]}
          </Text>
          <ProgressBar
            progress={(step + 1) / steps.length}
            color="#1F4E82"
            style={{ height: 8, borderRadius: 999, backgroundColor: "#DEE8F4" }}
          />
        </Card.Content>
      </Card>

      {step === 0 ? (
        <Card style={{ borderRadius: 20, backgroundColor: "#F8FAFD" }}>
          <Card.Content style={{ gap: 12 }}>
            <Text variant="titleMedium" style={{ fontWeight: "800", color: "#173D62" }}>
              Start with essentials
            </Text>
            <TextInput label="Name" value={name} onChangeText={setName} />
            <Text style={{ color: "#60748C" }}>Primary goal</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {[
                { key: "lose_weight", label: "Lose weight" },
                { key: "eat_healthier", label: "Eat healthier" },
                { key: "track_spending", label: "Track spending" },
              ].map((entry) => (
                <Chip
                  key={entry.key}
                  selected={goal === entry.key}
                  onPress={() => setGoal(entry.key as keyof typeof goalMap)}
                >
                  {entry.label}
                </Chip>
              ))}
            </View>
          </Card.Content>
        </Card>
      ) : null}

      {step === 1 ? (
        <Card style={{ borderRadius: 20, backgroundColor: "#F8FAFD" }}>
          <Card.Content style={{ gap: 12 }}>
            <Text variant="titleMedium" style={{ fontWeight: "800", color: "#173D62" }}>
              Get value now
            </Text>
            <Text style={{ color: "#60748C" }}>
              Scan your first receipt before we ask for more profile data.
            </Text>
            <Button mode="contained" onPress={() => router.push("/(tabs)/scan/receipt")}>
              Scan first receipt
            </Button>
            <Text style={{ color: hasScannedReceipt ? "#2F6F57" : "#60748C" }}>
              {hasScannedReceipt ? "Receipt found. Continue to finish setup." : "No receipt scanned yet."}
            </Text>
          </Card.Content>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card style={{ borderRadius: 20, backgroundColor: "#F8FAFD" }}>
          <Card.Content style={{ gap: 12 }}>
            <Text variant="titleMedium" style={{ fontWeight: "800", color: "#173D62" }}>
              Optional targets
            </Text>
            <Text style={{ color: "#60748C" }}>
              Add weight and height to enable personalized nutrition targets.
            </Text>
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

      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Button mode="text" disabled={step === 0} onPress={() => setStep((prev) => prev - 1)}>
          Back
        </Button>
        <Button mode="contained" disabled={!canContinue || updateUser.isPending} onPress={onContinue}>
          {step === steps.length - 1 ? "Finish" : "Continue"}
        </Button>
      </View>
    </Screen>
  );
}
