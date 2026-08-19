"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LogoutButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function logout() {
    setPending(true);
    try { await fetch("/api/auth/session", { method: "DELETE" }); } finally { router.push("/login"); router.refresh(); }
  }
  return <button type="button" onClick={logout} disabled={pending} className={className}>{pending ? "Signing out..." : "Sign out"}</button>;
}
