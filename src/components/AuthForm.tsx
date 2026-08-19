"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, inMemoryPersistence, setPersistence, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { getClientAuth, hasFirebaseClientConfig } from "@/lib/firebaseClient";

type Mode = "login" | "register";

function friendlyAuthError(error: unknown): string {
  const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code: unknown }).code) : "";
  if (code.includes("invalid-credential")) return "Email or password is incorrect.";
  if (code.includes("email-already-in-use")) return "An account already uses this email.";
  if (code.includes("weak-password")) return "Use a stronger password with at least 8 characters.";
  if (code.includes("invalid-email")) return "Enter a valid email address.";
  if (code.includes("too-many-requests")) return "Too many attempts. Please wait and try again.";
  return error instanceof Error ? error.message : "Authentication failed. Please try again.";
}

export default function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const displayName = String(form.get("displayName") ?? "").trim();
    if (mode === "register" && displayName.length < 2) return setError("Choose a display name with at least 2 characters.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");

    setPending(true);
    setError(null);
    try {
      const auth = getClientAuth();
      await setPersistence(auth, inMemoryPersistence);
      const credential = mode === "register" ? await createUserWithEmailAndPassword(auth, email, password) : await signInWithEmailAndPassword(auth, email, password);
      if (mode === "register") await updateProfile(credential.user, { displayName });
      const idToken = await credential.user.getIdToken(true);
      const response = await fetch("/api/auth/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to sign in.");
      await auth.signOut();
      router.push(data.user.role === "admin" || data.user.role === "superadmin" ? "/admin" : "/account");
      router.refresh();
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setPending(false);
    }
  }

  const configured = hasFirebaseClientConfig();
  return (
    <div className="game-panel w-full max-w-md rounded-3xl p-6 sm:p-8">
      <div className="grid grid-cols-2 rounded-xl bg-black/20 p-1" role="tablist">
        {(["login", "register"] as const).map((item) => <button key={item} type="button" onClick={() => { setMode(item); setError(null); }} className={`rounded-lg px-3 py-2.5 text-sm font-bold capitalize ${mode === item ? "bg-emerald-400/15 text-emerald-300" : "text-stone-500 hover:text-stone-300"}`} role="tab" aria-selected={mode === item}>{item === "login" ? "Sign in" : "Create account"}</button>)}
      </div>
      <div className="mt-7"><p className="eyebrow">{mode === "login" ? "Welcome back" : "Join the realm"}</p><h1 className="mt-2 text-3xl font-black tracking-tight text-white">{mode === "login" ? "Continue your quest" : "Become a Kawal"}</h1><p className="mt-2 text-sm leading-6 text-stone-500">{mode === "login" ? "Sign in to access your player account." : "Every new account begins with the player role."}</p></div>
      {!configured && <div className="mt-5 rounded-xl border border-amber-300/20 bg-amber-300/8 p-3 text-xs leading-5 text-amber-200" role="alert">Firebase web authentication is not configured. Add the documented <code>NEXT_PUBLIC_FIREBASE_*</code> values to <code>.env.local</code>.</div>}
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {mode === "register" && <label className="block text-xs font-bold uppercase tracking-wider text-stone-500">Display name<input name="displayName" autoComplete="nickname" required minLength={2} maxLength={40} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm normal-case tracking-normal text-white placeholder:text-stone-700" placeholder="Your guardian name" /></label>}
        <label className="block text-xs font-bold uppercase tracking-wider text-stone-500">Email<input name="email" type="email" autoComplete="email" required className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm normal-case tracking-normal text-white placeholder:text-stone-700" placeholder="you@example.com" /></label>
        <label className="block text-xs font-bold uppercase tracking-wider text-stone-500">Password<input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={8} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm normal-case tracking-normal text-white placeholder:text-stone-700" placeholder="At least 8 characters" /></label>
        {error && <p className="rounded-xl border border-red-400/20 bg-red-400/8 p-3 text-sm text-red-200" role="alert">{error}</p>}
        <button disabled={!configured || pending} className="w-full rounded-xl bg-amber-300 px-5 py-3.5 text-sm font-black text-[#172018] hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50">{pending ? "Securing session..." : mode === "login" ? "Sign in →" : "Create player account →"}</button>
      </form>
    </div>
  );
}
