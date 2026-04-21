# SETUP — External Accounts & Keys

Phase 0 scaffolds the repo but cannot run the app yet — several
things live outside this codespace. Work through this checklist
before Phase 1.

## 1. Supabase project

1. Create a Supabase project at https://supabase.com.
   - **Region:** pick a US/EU region close to your primary player base.
   - **Plan:** Free tier is fine until closed beta; upgrade to Pro
     before launch (Realtime + Point-in-Time Recovery matter).
2. In the project dashboard → Database → Extensions, enable **postgis**.
   (Migration `20260421000001_enable_extensions.sql` also does this,
   but the dashboard is faster for a sanity check.)
3. Install the Supabase CLI locally:
   ```bash
   brew install supabase/tap/supabase   # or platform equivalent
   ```
4. Link this repo to your project and push migrations:
   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```
5. From the project Settings → API page, copy these into
   `apps/mobile/.env`:
   - `EXPO_PUBLIC_SUPABASE_URL` ← "Project URL"
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY` ← "anon public"
   - The **service role key** is a server-only secret — do NOT put it
     in `.env` under `EXPO_PUBLIC_*`. It goes in Edge Function env
     vars only (Supabase dashboard → Edge Functions → Secrets).

## 2. Mapbox

1. Create a Mapbox account at https://account.mapbox.com.
2. Create a **public token** (pk.*) scoped to the styles you'll use.
   - Put it in `apps/mobile/.env` as `EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN`.
3. Create a **download-scoped secret token** (sk.* with
   `DOWNLOADS:READ` scope).
   - This token downloads the native SDK during build.
   - Put it into `apps/mobile/app.json` under the `@rnmapbox/maps`
     plugin's `RNMapboxMapsDownloadToken`.
   - Alternatively, export `MAPBOX_DOWNLOAD_TOKEN` in EAS secrets and
     reference it in `eas.json`.

## 3. Expo / EAS

1. Create an Expo account at https://expo.dev.
2. Install the CLI: `npm install -g eas-cli`.
3. From `apps/mobile/`, run:
   ```bash
   eas init         # creates a project, writes projectId into app.json
   ```
4. Set build-time secrets on EAS:
   ```bash
   eas env:push --environment production --path .env
   ```
   (or set them individually with `eas env:create`).

## 4. Apple + Google developer accounts (launch-time only)

- **Apple Developer Program** ($99/yr) — required to submit to App
  Store. Configure signing once via `eas credentials`.
- **Google Play Console** (one-time $25) — required to publish on
  Android. Generate a service account JSON and add via
  `eas submit --android` flow.
- These are NOT needed for development builds on simulator/device;
  you can defer until the Phase 14 launch pass.

## 5. Google Places API (Phase 6)

1. Create a Google Cloud project at https://console.cloud.google.com.
2. Enable "Places API (New)" and "Maps JavaScript API".
3. Create an API key, restrict it to your app bundle IDs + SHA-1s.
4. Store it as a **server-side** Edge Function secret in Supabase
   (never expose a Places API key in the mobile bundle — bill shock
   risk). The mobile client talks to our `/bars/nearby` Edge Function,
   which talks to Google.

## 6. Google Business Profile Verifications API (Phase 10)

Separate from Places. Requires app verification and a per-app quota
grant. Start that review process early — it can take 2-4 weeks.

## 7. RevenueCat (Phase 9)

1. Create a RevenueCat project at https://www.revenuecat.com.
2. Link to App Store Connect and Google Play Console.
3. Install the SDK (`react-native-purchases`) when Phase 9 starts.
4. Store the public SDK key in `apps/mobile/.env` as
   `EXPO_PUBLIC_REVENUECAT_KEY`.

## 8. PostHog

1. Self-hosted or cloud (https://posthog.com).
2. API key → `EXPO_PUBLIC_POSTHOG_KEY` in `apps/mobile/.env`.
3. Event schema is defined in spec §11 — name events there first,
   implement second.

## 9. Expo Push Notifications

No separate signup — included with Expo. But:

- iOS requires APNs key from Apple Developer account.
- Android requires Firebase project + `google-services.json`.
- Configure once via `eas credentials`.

---

## Checklist summary

- [ ] Supabase project + migrations pushed
- [ ] Mapbox public token + download token
- [ ] Expo account + EAS project
- [ ] `.env` filled in for `apps/mobile`
- [ ] (Deferrable) Apple + Google dev accounts
- [ ] (Phase 6) Google Places API key
- [ ] (Phase 9) RevenueCat project
- [ ] (Phase 10) Google Business Verifications review submitted
- [ ] (Phase 13) PostHog project

When all Phase 0 checkboxes are filled, you can move to Phase 1 —
auth + character creation.
