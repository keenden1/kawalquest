"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { getClientAuth, hasFirebaseClientConfig } from "@/lib/firebaseClient";
import PasswordField from "@/components/PasswordField";

type Status = "verifying" | "valid" | "invalid" | "success";

function errorCode(error: unknown): string {
  return typeof error === "object" && error !== null && "code" in error ? String((error as { code: unknown }).code) : "";
}

function friendlyResetError(error: unknown): string {
  const code = errorCode(error);
  if (code.includes("expired-action-code")) return "This reset link has expired. Request a new one from the sign-in page.";
  if (code.includes("invalid-action-code")) return "This reset link is invalid or has already been used.";
  if (code.includes("user-disabled")) return "This account has been disabled.";
  if (code.includes("weak-password")) return "Use a stronger password with at least 8 characters.";
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

export default function ResetPasswordForm({ oobCode }: { oobCode: string | null }) {
  const configured = hasFirebaseClientConfig();
  const [status, setStatus] = useState<Status>(oobCode && configured ? "verifying" : "invalid");
  const [email, setEmail] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!oobCode || !configured) return;
    let cancelled = false;
    (async () => {
      try {
        const auth = getClientAuth();
        const verifiedEmail = await verifyPasswordResetCode(auth, oobCode);
        if (!cancelled) { setEmail(verifiedEmail); setStatus("valid"); }
      } catch (err) {
        if (!cancelled) { setVerifyError(friendlyResetError(err)); setStatus("invalid"); }
      }
    })();
    return () => { cancelled = true; };
  }, [oobCode, configured]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!oobCode) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");
    if (password.length < 8) return setSubmitError("Password must be at least 8 characters.");
    if (password !== confirmPassword) return setSubmitError("Passwords do not match.");

    setPending(true);
    setSubmitError(null);
    try {
      const auth = getClientAuth();
      await confirmPasswordReset(auth, oobCode, password);
      setStatus("success");
    } catch (err) {
      setSubmitError(friendlyResetError(err));
    } finally {
      setPending(false);
    }
  }

  if (status === "success") {
    return (
      <div className="game-panel w-full max-w-md rounded-3xl p-6 sm:p-8">
        <p className="eyebrow">All set</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Password updated</h1>
        <p className="mt-2 text-sm leading-6 text-stone-500">Your password has been changed. Sign in with your new password to continue your quest.</p>
        <Link href="/login" className="mt-6 block w-full rounded-xl bg-amber-300 px-5 py-3.5 text-center text-sm font-black text-[#172018] hover:bg-amber-200">Back to sign in →</Link>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="game-panel w-full max-w-md rounded-3xl p-6 sm:p-8">
        <p className="eyebrow">Link unavailable</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Reset link invalid</h1>
        <p className="mt-2 text-sm leading-6 text-stone-500">{!configured ? "Firebase web authentication is not configured." : (verifyError ?? "This reset link is invalid or missing. Request a new one from the sign-in page.")}</p>
        <Link href="/login" className="mt-6 block w-full rounded-xl border border-white/10 px-5 py-3.5 text-center text-sm font-black uppercase tracking-wider text-stone-200 hover:bg-white/8">Back to sign in</Link>
      </div>
    );
  }

  if (status === "verifying") {
    return (
      <div className="game-panel w-full max-w-md rounded-3xl p-6 sm:p-8">
        <p className="eyebrow">One moment</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Checking your link...</h1>
      </div>
    );
  }

  return (
    <div className="game-panel w-full max-w-md rounded-3xl p-6 sm:p-8">
      <p className="eyebrow">Recover access</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Set a new password</h1>
      <p className="mt-2 text-sm leading-6 text-stone-500">{email ? `Choose a new password for ${email}.` : "Choose a new password for your account."}</p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <PasswordField id="new-password" name="password" label="New password" autoComplete="new-password" placeholder="At least 8 characters" />
        <PasswordField id="confirm-new-password" name="confirmPassword" label="Confirm new password" autoComplete="new-password" placeholder="Re-enter your new password" />
        {submitError && <p className="rounded-xl border border-red-400/20 bg-red-400/8 p-3 text-sm text-red-200" role="alert">{submitError}</p>}
        <button disabled={pending} className="w-full rounded-xl bg-amber-300 px-5 py-3.5 text-sm font-black text-[#172018] hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50">{pending ? "Updating..." : "Update password →"}</button>
      </form>
    </div>
  );
}
