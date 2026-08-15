# Kawal Quest Admin

Local admin dashboard for the [Kawal Quest](../Kawal%20Quest) Unity project's Firebase
backend. Separate Next.js project — not part of the Unity repo.

## Setup

1. `npm install` (already done if you just cloned/copied this folder fresh, skip if `node_modules` exists)
2. Get a Firebase service account key: Firebase Console → Project Settings → Service
   accounts → **Generate new private key**. This downloads a `.json` file — do not commit it.
3. Copy `.env.local.example` to `.env.local` and fill in `FIREBASE_PROJECT_ID`,
   `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` from that JSON file.
4. `npm run dev` and open [http://localhost:3000](http://localhost:3000)

## Pages

- `/` — dashboard home
- `/players` — leaderboard, reads the `players` Firestore collection (server-rendered, live data)
- `/remote-config` — toggle for the `adminConfig/flags.showCheatButton` flag (Unity-side read not wired up yet)
- `/top-up` — placeholder; Xsolla top-up isn't implemented in-game yet

## Security note

**No authentication is enforced on this dashboard.** It's intended for local-only use
right now. Do not deploy it publicly (Vercel, etc.) without adding auth in front of it —
the Firebase Admin SDK it uses has full read/write access to the project's Firestore data.
