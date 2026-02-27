export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
}

export function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = clamp(p, 0, 1) * (sorted.length - 1);
  const low = Math.floor(rank);
  const high = Math.ceil(rank);
  if (low === high) return sorted[low];
  const t = rank - low;
  return sorted[low] * (1 - t) + sorted[high] * t;
}

export function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function mad(values: number[]): number {
  if (!values.length) return 0;
  const center = median(values);
  const deviations = values.map((value) => Math.abs(value - center));
  return median(deviations);
}

export function robustZScore(value: number, values: number[]): number {
  if (!values.length) return 0;
  const center = median(values);
  const medianAbsDev = mad(values);
  if (medianAbsDev <= 1e-9) {
    const sigma = stdDev(values);
    if (sigma <= 1e-9) return 0;
    return (value - center) / sigma;
  }
  return (value - center) / (1.4826 * medianAbsDev);
}

export function linearRegressionSlope(values: number[]): number {
  if (values.length < 2) return 0;
  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = mean(values);
  let numerator = 0;
  let denominator = 0;
  for (let index = 0; index < n; index += 1) {
    const x = index - xMean;
    const y = values[index] - yMean;
    numerator += x * y;
    denominator += x * x;
  }
  if (denominator === 0) return 0;
  return numerator / denominator;
}

export function coefficientOfVariation(values: number[]): number {
  const avg = mean(values);
  if (Math.abs(avg) < 1e-9) return 0;
  return stdDev(values) / Math.abs(avg);
}
