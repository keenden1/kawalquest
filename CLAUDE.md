# CLAUDE.md

This file gives Claude project-specific instructions for working in this repository.

## Project overview

- **Project:** Kawal Quest Admin
- **Purpose:** A local admin dashboard for the Kawal Quest Unity project's Firebase backend
- **Stack:** Next.js 16.3.1 App Router, React 19, TypeScript, Tailwind CSS 4, and Firebase Admin SDK
- **Package manager:** npm (use the committed `package-lock.json`)
- **Source alias:** `@/*` maps to `src/*`

The dashboard currently provides a home page, a Firestore-backed player leaderboard, a remote-config flag editor, and a placeholder top-up page.

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
