# SmartSpendAI Accuracy Audit + Implementation Plan

Date: 2026-02-25
Scope: End-to-end ingestion, nutrition inference, logging, analytics, alerts, and UX trust signals.

## 1. Critical Audit Findings

### A. Data Integrity + Accuracy Risks
- Consumption logging accepted placeholder zero nutrients from UI actions, polluting analytics and alert logic.
- Nutrition mapping used truthy checks (`row.value ? Number(...)`) which dropped valid zero values.
- No persisted confidence lineage from source (`label_scan`, `barcode_api`, `ai_inferred`) into logs and alerts.
- Alert engine used raw rolling averages without data reliability gating, increasing false-positive risk.

### B. Reasoning / Statistical Gaps
- No robust statistics: no median, MAD, robust z-score, or trend slope for anomaly detection.
- No reliability score to qualify whether insights should be trusted before notifying users.
- No persisted analytical snapshots for longitudinal model quality tracking.
- No item-level consumption modeling to estimate pattern confidence.

### C. UX Trust Gaps
- Dashboard had no visibility into data quality/reliability confidence.
- Trends lacked anomaly counts and confidence context.

## 2. Implemented in This Pass

### A. Data Layer + Storage
- Added `confidence_score` and `source` in `daily_nutrition_logs`.
- Added `nutrition_analytics_snapshots` table for persisted analytics metrics.
- Added `consumption_models` table for per-item consumption trend models.
- Added migration guard in DB bootstrap to safely add new columns on existing installs.

### B. Robust Reasoning Engine
- Added statistics core:
  - Mean/median/percentile
  - MAD-based robust z-score
  - Linear regression slope
  - Coefficient of variation
- Added nutrition analytics service:
  - Computes nutrient metrics (`recentAvg`, `median`, `p90`, `zScore`, `trendSlope`, `targetGapRatio`)
  - Computes reliability score from coverage + source confidence + profile match
  - Detects anomalies from robust statistical signals
  - Persists snapshots
- Added consumption model service:
  - Per-item average daily servings, slope, variability, confidence
  - Persisted model updates

### C. Logging + Inference Accuracy
- Added resolved consumption log builder:
  - Auto-fills nutrient values from item nutrition profile when UI payload is sparse/placeholder
  - Prevents zero-placeholder pollution
  - Computes per-log confidence score
- Added nutrition profile sanitization/clamping before write to prevent impossible ranges.

### D. Alert Reliability Upgrade
- Refactored alert engine to use analytics snapshots and reliability-aware gating.
- Severity now uses combined target gap + robust anomaly signal.
- Low-confidence data can suppress weak/uncertain alerts.
- Retained expiry alert channel.

### E. UI Reliability Visibility
- Home: added reliability and coverage score + anomaly count.
- Nutrition Trends: added reasoning confidence panel.
- Nutrition Daily: added data quality card with average confidence.
- Expense detail: shows model confidence for item consumption model.

## 3. Mathematical Model (Operational)

Per-log confidence:

```
Q_log = clamp(
  0.15
  + 0.35 * completeness
  + 0.25 * profile_confidence
  + 0.15 * profile_recency_weight
  + 0.10 * source_weight
)
```

System reliability:

```
R = clamp(
  0.35 * day_coverage
  + 0.25 * macro_coverage
  + 0.20 * profile_match_coverage
  + 0.20 * confidence_blend
)
```

Anomaly score:

```
z_robust = (recent_avg - median(series)) / (1.4826 * MAD(series))
```

Alert severity is derived from:

```
severity_signal = |target_gap_ratio| + 0.16 * |z_robust|
```

with reliability-aware suppression thresholds.

## 4. Next Implementation Phases (Recommended)

### Phase A: Evidence Expansion
- Track source-level confusion matrix (label vs barcode vs AI) with manual correction outcomes.
- Add calibration curves for `confidence_score` against observed correction rates.
- Add active-learning queue prioritized by highest uncertainty and highest usage frequency.

### Phase B: Causal Signal Modeling
- Build state-space consumption model per item:
  - latent true consumption rate
  - observation noise from log confidence
  - trend + seasonality components
- Use Bayesian update per new log / purchase.

### Phase C: Household Intelligence
- Allocate consumption per household member using weighted RDA + external meal exclusions.
- Build member-level deficiency posterior probabilities (not only deterministic thresholds).

### Phase D: Production Validation Harness
- Add synthetic and replay test suites:
  - known receipts + nutrition truths
  - perturbation tests (missing fields, noisy OCR)
  - alert precision/recall dashboards
- Define hard quality gates:
  - false alert rate
  - confidence calibration error
  - nutrition MAE vs trusted references

## 5. Reliability Principle

No insight should be surfaced without:
- a computed confidence score,
- a data coverage signal,
- and a clear source lineage.

This implementation establishes that foundation in code and schema.
