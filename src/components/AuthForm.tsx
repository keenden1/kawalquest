"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, inMemoryPersistence, setPersistence, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { getClientAuth, hasFirebaseClientConfig } from "@/lib/firebaseClient";
import PasswordField from "@/components/PasswordField";

type Mode = "login" | "register" | "reset";

const RESET_COOLDOWN_MS = 4 * 60 * 1000;

function errorCode(error: unknown): string {
  return typeof error === "object" && error !== null && "code" in error ? String((error as { code: unknown }).code) : "";
}

function friendlyAuthError(error: unknown): string {
  const code = errorCode(error);
  if (code.includes("invalid-credential")) return "Email or password is incorrect.";
  if (code.includes("email-already-in-use")) return "An account already uses this email.";
  if (code.includes("weak-password")) return "Use a stronger password with at least 8 characters.";
  if (code.includes("invalid-email")) return "Enter a valid email address.";
  if (code.includes("too-many-requests")) return "Too many attempts. Please wait and try again.";
  return error instanceof Error ? error.message : "Authentication failed. Please try again.";
}

function resetCooldownKey(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  return normalized ? `kawal_reset_cooldown:${normalized}` : null;
}

function formatCooldown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function readResetCooldown(email: string): number | null {
  if (typeof window === "undefined") return null;
  const key = resetCooldownKey(email);
  if (!key) return null;
  const stored = Number(window.localStorage.getItem(key) ?? 0);
  return stored > Date.now() ? stored : null;
}

export default function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [resetEmail, setResetEmail] = useState("");
  const [resetSending, setResetSending] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!cooldownUntil) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  const cooldownRemainingMs = cooldownUntil ? Math.max(0, cooldownUntil - now) : 0;
  const onCooldown = cooldownRemainingMs > 0;

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setResetError(null);
    setResetMessage(null);
    if (next === "reset") setCooldownUntil(readResetCooldown(resetEmail));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");
    const displayName = String(form.get("displayName") ?? "").trim();
    if (mode === "register" && displayName.length < 2) return setError("Choose a display name with at least 2 characters.");
    if (mode === "register" && displayName.length > 10) return setError("Display name must be 10 characters or fewer.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (mode === "register" && password !== confirmPassword) return setError("Passwords do not match.");

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

  async function handleResetSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = resetEmail.trim().toLowerCase();
    if (!email) return setResetError("Enter your account email.");
    if (onCooldown || resetSending) return;

    setResetSending(true);
    setResetError(null);
    setResetMessage(null);
    try {
      const response = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await response.json();
      if (!response.ok) { setResetError(data.error ?? "Something went wrong sending the reset link. Please try again."); setResetSending(false); return; }
    } catch {
      setResetError("Something went wrong sending the reset link. Please try again.");
      setResetSending(false);
      return;
    }

    const until = Date.now() + RESET_COOLDOWN_MS;
    const key = resetCooldownKey(email);
    if (key) window.localStorage.setItem(key, String(until));
    setCooldownUntil(until);
    setNow(Date.now());
    setResetMessage("If an account exists for that email, a reset link is on its way. Check your inbox.");
    setResetSending(false);
  }

  const configured = hasFirebaseClientConfig();

  if (mode === "reset") {
    return (
      <div className="game-panel w-full max-w-md rounded-3xl p-6 sm:p-8">
        <button type="button" onClick={() => switchMode("login")} className="text-xs font-bold text-stone-500 hover:text-stone-300">← Back to sign in</button>
        <div className="mt-5"><p className="eyebrow">Recover access</p><h1 className="mt-2 text-3xl font-black tracking-tight text-white">Reset your password</h1><p className="mt-2 text-sm leading-6 text-stone-500">Enter the email on your account and we&apos;ll send you a link to reset your password.</p></div>
        <form onSubmit={handleResetSubmit} className="mt-6 space-y-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-500">
            Email
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              value={resetEmail}
              onChange={(event) => { const value = event.target.value; setResetEmail(value); setResetError(null); setCooldownUntil(readResetCooldown(value)); }}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm normal-case tracking-normal text-white placeholder:text-stone-700"
              placeholder="you@example.com"
            />
          </label>
          {resetError && <p className="rounded-xl border border-red-400/20 bg-red-400/8 p-3 text-sm text-red-200" role="alert">{resetError}</p>}
          {resetMessage && <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/8 p-3 text-sm text-emerald-200" role="status">{resetMessage}</p>}
          <button disabled={resetSending || onCooldown} className="w-full rounded-xl bg-amber-300 px-5 py-3.5 text-sm font-black text-[#172018] hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50">
            {resetSending ? "Sending..." : onCooldown ? `Resend in ${formatCooldown(cooldownRemainingMs)}` : "Send reset link →"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="game-panel w-full max-w-md rounded-3xl p-6 sm:p-8">
      <div className="grid grid-cols-2 rounded-xl bg-black/20 p-1" role="tablist">
        {(["login", "register"] as const).map((item) => <button key={item} type="button" onClick={() => switchMode(item)} className={`rounded-lg px-3 py-2.5 text-sm font-bold capitalize ${mode === item ? "bg-emerald-400/15 text-emerald-300" : "text-stone-500 hover:text-stone-300"}`} role="tab" aria-selected={mode === item}>{item === "login" ? "Sign in" : "Create account"}</button>)}
      </div>
      <div className="mt-7"><p className="eyebrow">{mode === "login" ? "Welcome back" : "Join the realm"}</p><h1 className="mt-2 text-3xl font-black tracking-tight text-white">{mode === "login" ? "Continue your quest" : "Become a Kawal"}</h1><p className="mt-2 text-sm leading-6 text-stone-500">{mode === "login" ? "Sign in to access your player account." : "Every new account begins with the player role."}</p></div>
      {!configured && <div className="mt-5 rounded-xl border border-amber-300/20 bg-amber-300/8 p-3 text-xs leading-5 text-amber-200" role="alert">Firebase web authentication is not configured. Add the documented <code>NEXT_PUBLIC_FIREBASE_*</code> values to <code>.env.local</code>.</div>}
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {mode === "register" && (
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-500">
            Display name
            <input name="displayName" autoComplete="nickname" required minLength={2} maxLength={10} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm normal-case tracking-normal text-white placeholder:text-stone-700" placeholder="Your guardian name" />
            <span className="mt-1 block text-[10px] font-medium normal-case tracking-normal text-stone-600">Up to 10 characters</span>
          </label>
        )}
        <label className="block text-xs font-bold uppercase tracking-wider text-stone-500">Email<input name="email" type="email" autoComplete="email" required className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm normal-case tracking-normal text-white placeholder:text-stone-700" placeholder="you@example.com" /></label>
        <PasswordField id="auth-password" name="password" label="Password" autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="At least 8 characters" />
        {mode === "register" && <PasswordField id="auth-confirm-password" name="confirmPassword" label="Confirm password" autoComplete="new-password" placeholder="Re-enter your password" />}
        {mode === "login" && <button type="button" onClick={() => switchMode("reset")} className="block w-full text-right text-xs font-bold text-emerald-400 hover:text-emerald-300">Forgot password?</button>}
        {error && <p className="rounded-xl border border-red-400/20 bg-red-400/8 p-3 text-sm text-red-200" role="alert">{error}</p>}
        <button disabled={!configured || pending} className="w-full rounded-xl bg-amber-300 px-5 py-3.5 text-sm font-black text-[#172018] hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50">{pending ? "Securing session..." : mode === "login" ? "Sign in →" : "Create player account →"}</button>
      </form>
    </div>
  );
}
