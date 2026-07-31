# Town Therapy

A civic engagement mobile app for [Town Therapy](https://towntherapy.club) — Hazaribagh's youth squad turning complaints into action.

**RANT. REPORT. REFORM**

## Features

- **Home** — Dashboard with issue stats, quick report, upcoming events, and community wins
- **Reports** — Track civic issues you've flagged for the town
- **Events** — Browse cleanup drives and RSVP to participate
- **Community** — Share success stories, before/after updates, and local hero moments
- **Profile** — Volunteer stats, badges, and civic tips assistant

## Run locally

```bash
cd town-therapy
npm install
cp .env.example .env
npm start
```

Then press `i` for iOS simulator, `a` for Android, or scan the QR code with Expo Go.

### Cross-device sync (admin → volunteers)

Without Supabase, the app uses **local storage on each phone**. Events created by admin on one device will **not** appear on another.

1. Create a Supabase project and run `supabase/schema.sql` (+ `seed.sql` if needed).
2. Put your keys in `.env`:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

3. Restart Expo (`npm start`) so both admin and volunteer builds pick up the same keys.
4. On volunteer devices, open Events and pull to refresh after admin publishes.

## Tech stack

- Expo SDK 54
- React Native
- Expo Router (file-based navigation)
- Supabase (optional — required for multi-device sync)

## About Town Therapy

Town Therapy is a group of citizens in Hazaribagh, Jharkhand who love their town enough to step up and act — through clean-up drives, awareness campaigns, and holding authorities accountable.

Learn more at [towntherapy.club](https://towntherapy.club)
