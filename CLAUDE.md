# CLAUDE.md

This file gives Claude project-specific instructions for working in this repository.

## Editable in-game About credits - 2026-09-18

- Location: Admin > Game controls > About Kawal Quest - Credits (`/admin/remote-config`). `AboutCreditsEditor` provides a multiline editor, character count, preview, explicit Save credits, loading/retry, and success/error states.
- Storage: `adminConfig/flags.aboutCredits`, one plain-text string shared by the game's English and Filipino About panels. Preserve line breaks. Saving empty text hides the section; other About copy remains built into Unity.
- Existing `/api/remote-config` GET returns saved credits or an empty string. POST accepts at most 2,000 characters, normalizes CRLF/CR to LF, trims outer whitespace, and rejects non-string values, markup delimiters, and unsupported control characters before writing. Server-side admin/superadmin authorization remains enforced. Merge writes preserve unrelated settings.
- Unity integration: `FirebaseManager.AboutCredits` uses the existing live content listener. `AboutKawalQuest` refreshes on content changes, hides blank credits, and prevents TMP markup interpretation. Do not apply the 40-character character-name limit to multiline credits.
- Files: `src/components/AboutCreditsEditor.tsx`, `src/app/admin/remote-config/page.tsx`, `src/app/api/remote-config/route.ts`, `tests/about-credits.test.cjs`; Unity counterparts are `Assets/Scripts/SaveSystem/FirebaseManager.cs` and `Assets/Scripts/UI/AboutKawalQuest.cs` in `../Kawal Quest`.
- Validation: `node --test tests/about-credits.test.cjs tests/mob-names.test.cjs` passed all 13 tests; TypeScript (`--noEmit --incremental false`) and targeted ESLint passed. Unity runtime compilation passed with existing warnings. No production build, deployment, or browser-to-Unity live test is claimed.
- Remaining: deploy the updated web and rebuild the game; check save/clear, multiline and long credits, reconnect behavior, live refresh while About is open, and EN/TL display. No developer names were invented and no live credits were published.

## Project overview

- **Project:** Kawal Quest Admin
- **Purpose:** A local admin dashboard for the Kawal Quest Unity project's Firebase backend
- **Stack:** Next.js 16.3.1 App Router, React 19, TypeScript, Tailwind CSS 4, and Firebase Admin SDK
- **Package manager:** npm (use the committed `package-lock.json`)
- **Source alias:** `@/*` maps to `src/*`

The dashboard currently provides a home page, a Firestore-backed player leaderboard, a remote-config flag editor, and a placeholder top-up page.

## Image storage and caching — 2026-09-15

- Admin Shop image uploads use the protected `/api/admin/image-upload` route and upload directly to Cloudflare R2 with signed PUT URLs. Files are limited to JPG, PNG, WebP, or GIF and 8 MB, receive unique immutable keys, and are stored with `public, max-age=31536000, immutable`.
- Firebase seed uploads set the same one-year immutable cache metadata. Existing Firebase images still benefit from Next image optimization; re-run the appropriate seed only when intentionally replacing those stored files.
- Remote Firebase and configured R2 images render through `next/image`. Optimized variants use WebP, responsive sizes, lazy loading, and a 31-day minimum server cache TTL. Keep `R2_PUBLIC_BASE_URL` available at build time so its exact host is included in `remotePatterns`.
- Shop image records continue storing the public URL in Firestore for Unity compatibility. Uploading a replacement creates a new URL, which safely invalidates all browser/CDN caches without deleting the previous object.

## User-facing service language and role saves — 2026-09-15

- Do not expose the Firebase provider name in user-facing or admin-facing labels, help text, metadata, or errors. Describe accounts, authentication, storage, and the live game service by their product purpose. Internal imports, types, environment variables, and developer documentation keep their technical names.
- The access-role table stages dropdown changes locally. A role changes only after a superadmin presses that row's Save button; show an explicit success or error message after the API responds.
- The Game Controls card describes `showCheatButton` as the Tester Cheat button and makes clear that regular player accounts never see it because Unity also applies its per-account role gate.

## Admin Xsolla payment history — 2026-09-15

- `/admin/top-up` is the admin-wide Xsolla receipt history. It reads each player's `players/{uid}/xsollaTopUps` receipts, merges them newest-first, and shows player, purchase, amount, Gold, status, date, and receipt ID with search, status filtering, and pagination.
- The page shows confirmed live webhook receipts only. Sandbox orders are intentionally ignored by the webhook, and abandoned checkout attempts without a confirmed payment are not receipts.
- Keep payment history read-only in the dashboard. `refund_pending_reconciliation` must remain visibly distinct because it means the refunded Gold may already have synced into Unity and needs manual review.

## Global page background — 2026-09-15

- Do not restore the repeating horizontal/vertical grid lines on the global `body` background. All public and admin pages use the clean dark background with only the soft green and gold radial lighting.

## Next.js version rules

<!-- BEGIN:nextjs-agent-rules -->

### This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may differ from training data. Before writing Next.js code, read the relevant guide in `node_modules/next/dist/docs/`. Heed all deprecation notices. Do not rely on remembered behavior when the installed documentation can answer the question.

This rule originates from the block maintained by `next dev` in `AGENTS.md`. Do not remove that generated block from `AGENTS.md`; Next.js will recreate it.

<!-- END:nextjs-agent-rules -->

## Working rules

- Read relevant files and the installed Next.js documentation before changing code.
- Preserve the existing App Router structure and nearby coding conventions.
- Prefer small, focused diffs and descriptive names.
- Keep TypeScript strict and avoid unsafe casts unless they are justified.
- Reuse existing components and styles before adding new abstractions.
- Do not add dependencies unless the task requires them.
- Handle loading, empty, and error states where applicable.
- Preserve responsive behavior and accessibility.
- Explain the root cause briefly when fixing a bug.

## Firebase and security

- Firebase Admin credentials belong only in `.env.local`; never hardcode or commit them.
- Do not expose service-account values or Firebase Admin objects to client components.
- Keep privileged Firebase operations in server-only code.
- Validate external input before Firestore writes.
- Preserve existing Firestore collection and document shapes unless a schema change is explicitly requested.
- Treat writes and seed operations as potentially destructive; confirm their scope before running them.
- Authentication uses Firebase email/password sign-in, HTTP-only Firebase session cookies, and the `role` custom claim.
- Treat `user`, `admin`, and `superadmin` as a strict privilege hierarchy. New accounts must default to `user`.
- Admin pages and APIs must enforce roles on the server; client-side visibility is never an authorization boundary.
- Only superadmins may assign roles, and role claims must only be written through the Firebase Admin SDK.

## Repository structure

```text
src/app/                    # App Router pages, layouts, styles, and route handlers
src/app/api/                # Server-side API route handlers
src/components/             # Shared React components
src/lib/firebaseAdmin.ts    # Server-side Firebase Admin initialization
scripts/seed.mjs            # Firestore seed script
public/                     # Static assets
```

## Commands

```bash
npm install       # install dependencies
npm run dev       # run the local development server
npm run lint      # run ESLint
npm run build     # create a production build and run Next.js checks
npm run start     # serve the production build
npm run seed      # seed Firestore; verify target project and data first
npm run set-role -- <uid-or-email> <role> # bootstrap or update a trusted role
```

There is currently no automated test command. Do not claim tests were run unless a test setup is added and executed.

## Verification

For code changes, run the checks relevant to the touched area:

1. `npm run lint`
2. `npm run build`
3. Manually verify affected routes when behavior or UI changes

Report what was checked, any failures, and any remaining risks. Do not run `npm run seed` merely as verification.

## Response expectations

When completing a task, briefly summarize what changed, list the files touched, and state the verification performed. Mention assumptions or follow-up risks only when relevant.

Direct user instructions take precedence over this file.

## Unity in-game Gold top-up — 2026-09-14

**Latest deployment status (Screenshot_61, 2026-09-14):** Unity showed "Gold packages are unavailable right now" with Retry/Back. A live request to `https://www.kawalquest.online/api/game/top-up` returned HTTP 404, while the new route existed locally. The backend must be deployed before the Unity catalog works; a phone does not resolve the missing endpoint. The existing website `/account/top-up` was reachable and redirected signed-out users to `/login`. Use the `www` domain; the bare domain failed DNS resolution during this session.

**Confirmed user choice:** Gold + offers Website top-up or In-game top-up; the in-game choice must keep payment inside the Android game. Unity Editor/Windows can test the chooser, deployed catalog and website checkout. Embedded payment requires testing the rebuilt APK on an Android phone; Android build-target selection alone does not enable it in Editor Play mode. Deployment, native checkout, cancellation/return and actual Gold delivery remain unverified. Guide remaining manual steps one at a time.

The Unity Gold + button now offers Website top-up and In-game top-up. The existing website flow remains separate. Added `src/app/api/game/top-up/route.ts`: GET returns the shared `XSOLLA_TOPUP_PACKAGES` and server availability/sandbox settings; POST requires a Firebase bearer ID token with revocation checking and an existing player document, validates the SKU against the shared catalog, and uses the verified UID/email to create an Xsolla token. Client UID/email/Gold/price/return URL inputs are ignored. Responses are no-store, provider errors are generic, and no payment details are logged. Availability also requires the webhook secret. No credentials are embedded in Unity.

Added the public `src/app/game/top-up-return/page.tsx` for returning from the embedded payment window; it never claims a successful payment from a redirect. Existing signed `order_paid` webhook and Unity pending-Gold listener remain the only credit path. Sandbox purchases do not add live Gold. Unity uses Xsolla SDK 3.1.19 ServerTokens mode with Android InGame WebView. Desktop/Editor use the website option because the SDK falls back to external browsing there.

Validation: eight mocked authentication/catalog/identity regression tests in `tests/game-top-up.test.cjs` passed (`node --test tests/game-top-up.test.cjs`); production build passed; lint passed with the three existing image warnings. Local production-server checks: catalog 200 (five packages), unauthenticated checkout 401, return page 200. Game scripts and Android SDK adapter compiled. No payment was made; no production deployment was performed. Deploy these routes before testing the rebuilt Android app, then verify embedded checkout, cancellation/retry and webhook Gold delivery on a device. Existing uncommitted account/payment-history/webhook changes were preserved.

## Mob-name editor � 2026-09-18

Remote Config's names section now includes ten regular mob names, separate from the existing ten boss names and two character names. Shared defaults in `src/lib/contentNames.ts` match current Unity assets, including corrected Arc 8-10 boss defaults. Names are editable with explicit Save, disabled loading/saving states, dirty tracking, and success/error feedback.

GET/POST `/api/remote-config` expose `mobNames`; POST requires admin/superadmin and exactly ten trimmed names of 2-40 characters, rejects markup/control characters and non-object payloads, and merges only requested keys (`mobNameArc1`...`mobNameArc10`) into adminConfig/flags. The sibling Unity project listens to those fields and updates regular enemy labels keyed by their MobSO arc. Boss naming remains independent.

Checks: `npm run build`, `npm run lint`, and `node --test tests/mob-names.test.cjs` all passed (six API tests). Local unauthenticated GET returned 401. Unity compilation with FIREBASE_ENABLED passed. No browser was available for visual verification; authenticated UI save/live game checks remain pending. No production configuration writes or deployment performed. Existing unrelated working-tree changes preserved.

## In-game model previews for mob/boss naming � 2026-09-18

Remote Config now shows model-preview galleries above each arc's mob/boss name field. `src/lib/mobPreviews.json` records the actual scene-to-prefab and MobSO mapping (42 mappings covering 20 arc/type groups). Several regular models share a mob name in one arc, so all matching variants are shown and the help text explicitly describes the shared name. Arc 2 does not show the troll and Arc 10 shows only its actual goblin variant. Bosses are mapped to their own encounter prefabs, including intentionally reused models.

`MobPreviewGallery.tsx` uses next/image, responsive thumbnails, labeled type=button controls, and a native dialog for enlarged previews with Close, Escape and backdrop dismissal. Name inputs retain their existing save behavior. Four regular-model and ten boss PNGs are bundled under `public/enemies/`; no external upload or live configuration write is needed. Images were rendered in Unity from actual meshes/albedo textures with neutral lighting; these are asset previews, not gameplay screenshots. Source prefab paths are recorded in the catalog.

Validation: production build and lint passed. All 20 arc/type groups have previews; all 14 PNGs validate at 512x512 and returned local HTTP 200. Inspected the distinct rendered models and corrected the first boss's aura/framing and wolf framing. No connected browser was available for interactive browser verification. The local production server was restarted at localhost:3000. Production deployment remains necessary for the public website.
