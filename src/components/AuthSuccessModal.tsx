"use client";

import { useEffect, useId, useRef } from "react";

export default function AuthSuccessModal({ title, message, buttonLabel = "Continue", onContinue }: {
  title: string;
  message: string;
  buttonLabel?: string;
  onContinue: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const messageId = useId();

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  return (
    <dialog ref={dialog} aria-labelledby={titleId} aria-describedby={messageId}
      onCancel={(event) => { event.preventDefault(); onContinue(); }}
      className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-sm rounded-3xl border border-emerald-300/20 bg-[#0b1b14] p-7 text-center text-white shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm">
      <div aria-hidden="true" className="mx-auto grid size-16 place-items-center rounded-full border border-emerald-300/25 bg-emerald-400/15 text-emerald-300">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="size-8"><path d="m5 12 4 4L19 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
      <h2 id={titleId} className="mt-5 text-2xl font-extrabold">{title}</h2>
      <p id={messageId} className="mt-3 text-sm leading-6 text-stone-300">{message}</p>
      <button type="button" autoFocus onClick={onContinue} className="mt-6 w-full rounded-xl bg-amber-300 px-5 py-3 text-sm font-extrabold text-[#172018] hover:bg-amber-200">{buttonLabel}</button>
    </dialog>
  );
}
