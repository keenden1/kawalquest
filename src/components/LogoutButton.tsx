"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthSuccessModal from "@/components/AuthSuccessModal";

export default function LogoutButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function logout() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/session", { method: "DELETE" });
      if (!response.ok) throw new Error("Sign out failed.");
      setSuccess(true);
    } catch {
      setError("Could not sign out. Please try again.");
    } finally {
      setPending(false);
    }
  }
  return <>
    <button type="button" onClick={logout} disabled={pending || success} className={className}>{pending ? "Signing out..." : "Sign out"}</button>
    {error && <span role="alert" className="text-xs text-red-300">{error}</span>}
    {success && <AuthSuccessModal title="Logout successful!" message="You've been signed out of Kawal Quest." buttonLabel="Back to sign in" onContinue={() => { router.replace("/login"); router.refresh(); }} />}
  </>;
}
