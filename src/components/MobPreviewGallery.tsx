"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import catalog from "@/lib/mobPreviews.json";

type Preview = (typeof catalog)[number];

export default function MobPreviewGallery({ arc, kind }: { arc: number; kind: "mob" | "boss" }) {
  const previews = catalog.filter((entry) => entry.arc === arc && entry.kind === kind);
  const [selected, setSelected] = useState<Preview | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const title = `Arc ${arc} ${kind === "boss" ? "boss" : "mob"}`;

  function close() {
    dialog.current?.close();
    setSelected(null);
  }

  return (
    <>
      <div className={`grid gap-2 ${previews.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
        {previews.map((preview) => (
          <button
            key={preview.image}
            type="button"
            onClick={() => { setSelected(preview); dialog.current?.showModal(); }}
            aria-label={`Enlarge ${title}${kind === "mob" ? `: ${preview.model}` : ""}`}
            className="group overflow-hidden rounded-lg border border-white/10 bg-[#131a1f] text-left transition hover:border-amber-300/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
          >
            <Image src={preview.image} alt={`${title} in-game model${kind === "mob" ? `: ${preview.model}` : ""}`} width={512} height={512}
              sizes={previews.length > 1 ? "(min-width: 1280px) 160px, 40vw" : "(min-width: 1280px) 320px, 80vw"}
              className="aspect-square w-full object-contain" />
            <span className="block px-2 py-1.5 text-center text-xs text-stone-300 group-hover:text-amber-200">
              {kind === "mob" ? preview.model : "View boss"}
            </span>
          </button>
        ))}
      </div>
      <dialog ref={dialog} onCancel={() => setSelected(null)} onClick={(event) => { if (event.target === event.currentTarget) close(); }}
        aria-label={`${title} model preview`}
        className="fixed inset-0 m-auto w-[min(92vw,640px)] max-h-[90dvh] overflow-auto rounded-2xl border border-white/15 bg-[#131a1f] p-4 text-white shadow-2xl backdrop:bg-black/80">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-bold">{title}{selected && kind === "mob" ? ` — ${selected.model}` : ""}</h3>
          <button type="button" onClick={close} autoFocus className="rounded-lg border border-white/20 px-4 py-2 text-sm hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-amber-300">Close</button>
        </div>
        {selected && <Image src={selected.image} alt={`${title} enlarged in-game model`} width={512} height={512} sizes="(min-width: 700px) 600px, 90vw" className="h-auto w-full object-contain" />}
      </dialog>
    </>
  );
}
