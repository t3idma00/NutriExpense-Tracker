import { Text } from "react-native-paper";
import { formatCurrency } from "@/utils/currency";

interface PriceTagProps {
  value: number;
  currency?: string;
  locale?: string;
}

export function PriceTag({ value, currency = "USD", locale = "en-US" }: PriceTagProps) {
  return (
    <Text variant="titleMedium" style={{ fontWeight: "700" }}>
      {formatCurrency(value, currency, locale)}
    </Text>
  );
}
