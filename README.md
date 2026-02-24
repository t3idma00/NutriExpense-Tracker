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

Set `EXPO_PUBLIC_ANTHROPIC_API_KEY` to enable Claude-based inference.
Without it, the app falls back to local heuristics and still works end-to-end.
