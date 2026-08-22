"use client";

import { useState } from "react";

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden="true">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden="true">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.8 21.8 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 7 11 7a21.8 21.8 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export default function PasswordField({
  id,
  name,
  label,
  autoComplete,
  placeholder,
  minLength = 8,
}: {
  id: string;
  name: string;
  label: string;
  autoComplete: string;
  placeholder: string;
  minLength?: number;
}) {
  const [show, setShow] = useState(false);
  return (
    <label className="block text-xs font-bold uppercase tracking-wider text-stone-500" htmlFor={id}>
      {label}
      <div className="relative mt-2">
        <input id={id} name={name} type={show ? "text" : "password"} autoComplete={autoComplete} required minLength={minLength} className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 pr-11 text-sm normal-case tracking-normal text-white placeholder:text-stone-700" placeholder={placeholder} />
        <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide password" : "Show password"} className="absolute inset-y-0 right-0 flex items-center px-3 text-stone-500 hover:text-stone-300">
          {show ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </label>
  );
}
