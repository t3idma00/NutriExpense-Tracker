# SmartSpendAI (Expo Mobile MVP)

SmartSpendAI is a React Native + Expo app that combines:

- Receipt scan flow (capture/import -> OCR pipeline -> review -> save)
- Expense storage with SQLite and typed repositories
- Nutrition parsing and AI nutrition estimation (with 30-day cache)
- Daily and trend nutrition analytics
- Health profile calculations (BMR/TDEE/macros)
- Smart alert engine for deficiencies/excess/expiry warnings
- Multi-language UI + lightweight receipt translation pipeline

## Run

```bash
npm install
npm run start
```

## If Expo Go Shows Red Screen (500 / babel-preset-expo)

Run:

```bash
npm run repair:expo
npm run start:clear
```

Run these as two separate steps. Start the app only after `repair:expo` finishes successfully.

## Project Structure

- `app/`: Expo Router screens and navigation
- `db/`: SQLite bootstrap, schema, repositories
- `modules/`: domain logic (receipt, nutrition, health, translate)
- `services/`: i18n and AI services
- `hooks/`: React Query hooks
- `store/`: Zustand stores
- `constants/`: theme and target values
- `types/`: shared TypeScript types

## AI Nutrition Key

Set `EXPO_PUBLIC_GEMINI_API_KEY` to enable Gemini-based inference.
Optional: set `EXPO_PUBLIC_GEMINI_MODEL` to override the default model selection.
Without it, the app falls back to local heuristics and still works end-to-end.

## Receipt OCR Key

Set `EXPO_PUBLIC_OCR_SPACE_API_KEY` to enable real bill text extraction from camera images.
Without it, the app uses the local demo fallback OCR text path.
