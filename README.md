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

## APK upload storage

Browser uploads use signed R2 PUT URLs. The bucket's CORS policy must allow the
website origin, the `PUT` method, and both `Content-Type` and `Content-Disposition`
headers. Preserve existing rules and headers (including `Cache-Control` and
`x-amz-meta-sha256` for other upload flows). Configure this under Cloudflare R2 >
your bucket > Settings > CORS Policy.

The APK upload API returns `contentType` and `contentDisposition`; the browser
must send both values unchanged as headers so the request matches its signature.

In Downloads, superadmins can also save an existing hosted APK link. Regular
admins use Upload APK; its completion endpoint verifies the R2 object before
saving the download URL. Direct URL updates require the superadmin role.

## Authentication setup

1. In Firebase Console, open **Authentication -> Sign-in method** and enable **Email/Password**.
2. Open **Project Settings -> General -> Your apps**, register/select a Web app, and copy its
   config values into the `NEXT_PUBLIC_FIREBASE_*` entries in `.env.local`.
3. Create your first account at `/login`. New accounts always receive the `user` role.
4. Bootstrap the first superadmin from a trusted terminal:

   ```bash
   npm run set-role -- your-email@example.com superadmin
   ```

5. Sign in again, open `/admin/users`, and assign other accounts as needed.

Roles are stored as Firebase Auth custom claims: `user` can access the player account,
`admin` can access dashboard operations, and `superadmin` can additionally manage roles.

## Pages

- `/` — public Kawal Quest landing page and leaderboard
- `/login` — player registration and sign-in
- `/account` — authenticated player account
- `/admin` — role-protected admin command center
- `/admin/players` — Firestore player leaderboard
- `/admin/remote-config` — game runtime flags
- `/admin/users` — superadmin-only role management

## Security note

Admin pages and mutation APIs verify a Firebase session cookie and role on the server.
Firebase Admin credentials remain server-only. Keep role assignment restricted, use HTTPS
in production, and configure appropriate Firebase Security Rules for any future browser-side
database access.
