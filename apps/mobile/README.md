# @barbrawl/mobile

React Native + Expo client for BarBrawl.

## Quick start

```bash
# From the repo root
pnpm install

# In apps/mobile
cp .env.example .env
# Fill in the values — see ../../SETUP.md for where each key comes from

pnpm start          # Metro bundler
pnpm ios            # iOS simulator (macOS only)
pnpm android        # Android emulator / device
```

## Layout

- `app/` — expo-router file-based routes
- `src/` — shared code (theme, stores, features, supabase client)
- `assets/` — icons, splash, images

## Stack

See `../../docs/BARBRAWL_SPEC.md` §8 for the locked stack. Key pieces:
Expo SDK 52, TypeScript strict, React Native Reanimated 3, Gesture
Handler, @gorhom/bottom-sheet, expo-location / notifications / haptics
/ av / secure-store, @rnmapbox/maps, react-native-svg, zustand,
@supabase/supabase-js.

## Scripts

- `pnpm start` — Metro bundler
- `pnpm lint` — ESLint
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm test` — Jest (via `jest-expo`)
