"use client";

import { useEffect, useState } from "react";
import { validateQuestion, type NPCQuestion, type QuestionContent } from "@/lib/npcQuestions";

type Row = NPCQuestion & { content: QuestionContent; revision: number; overridden: boolean };
type Draft = { content: QuestionContent; revision: number; reset: boolean };
const input = "w-full rounded-lg border border-white/20 bg-slate-950 px-3 py-2 text-white disabled:opacity-50";
const button = "rounded-lg border border-white/20 px-4 py-2 text-sm hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed";
async function getQuestions(signal?: AbortSignal): Promise<Row[]> {
  const response = await fetch("/api/npc-questions", { cache: "no-store", signal });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Could not load questions.");
  return data.questions;
}

export default function NPCQuestionsEditor() {
  const [rows, setRows] = useState<Row[]>([]);
  const [arc, setArc] = useState(1);
  const [level, setLevel] = useState(1);
  const [selected, setSelected] = useState("");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load(discardId?: string) {
    setLoading(true); setError(""); setNotice("");
    try {
      setRows(await getQuestions()); setReady(true);
      if (discardId) setDrafts(previous => { const next = { ...previous }; delete next[discardId]; return next; });
    } catch (error) { setError(error instanceof Error ? error.message : "Could not load questions."); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    const controller = new AbortController();
    getQuestions(controller.signal).then(questions => {
      if (!controller.signal.aborted) { setRows(questions); setReady(true); }
    }).catch(error => {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Could not load questions.");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  const available = rows.filter(row => row.arc === arc && row.level === level);
  const row = available.find(row => row.id === selected) ?? available[0];
  const draft = row ? drafts[row.id] : undefined;
  const content = draft?.content ?? row?.content;
  function change(next: QuestionContent) {
    if (!row) return;
    setDrafts(previous => ({ ...previous, [row.id]: { content: next, revision: previous[row.id]?.revision ?? row.revision, reset: false } }));
    setNotice(""); setError("");
  }
  async function save() {
    if (!row || !draft) return;
    setError(""); setNotice("");
    try {
      if (!draft.reset) validateQuestion(draft.content, row);
      setSaving(true);
      const response = await fetch("/api/npc-questions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, revision: draft.revision, reset: draft.reset, content: draft.content }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save the question.");
      setRows(previous => previous.map(item => item.id === row.id ? { ...item, ...data } : item));
      setDrafts(previous => { const next = { ...previous }; delete next[row.id]; return next; });
      setNotice("Saved. Updated games receive this question before the NPC's first question attempt. Existing attempts keep their current question.");
    } catch (error) { setError(error instanceof Error ? error.message : "Could not save the question."); }
    finally { setSaving(false); }
  }

  return <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 sm:p-7" aria-labelledby="npc-questions-title">
    <h2 id="npc-questions-title" className="text-xl font-semibold text-amber-300">NPC questions</h2>
    <p className="mt-2 text-sm text-slate-300">Edit questions and answers for each Adventure NPC. English and Filipino questions share the same answer choices. Rewards and the three-attempt rule stay unchanged.</p>
    <p className="mt-2 text-sm text-slate-400">NPCs marked Not configured need a question before they can be used. Changes require a game version that supports editable NPC questions.</p>
    {loading && <p className="mt-4" role="status">Loading questions…</p>}
    {error && <p className="mt-4 text-red-300" role="alert">{error}</p>}
    {notice && <p className="mt-4 text-emerald-300" role="status">{notice}</p>}
    {!ready && !loading && <button className={`${button} mt-4`} onClick={() => void load()}>Retry loading</button>}
    {ready && <fieldset disabled={loading || saving} className="mt-5 space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="space-y-1 text-sm">Arc<select className={input} value={arc} onChange={event => { setArc(Number(event.target.value)); setSelected(""); setNotice(""); }}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map(value => <option key={value} value={value}>Arc {value} — {rows.find(row => row.arc === value)?.arcName}</option>)}
        </select></label>
        <label className="space-y-1 text-sm">Level<select className={input} value={level} onChange={event => { setLevel(Number(event.target.value)); setSelected(""); setNotice(""); }}>
          {[1, 2, 3].map(value => <option key={value} value={value}>Level {value}</option>)}
        </select></label>
        <label className="space-y-1 text-sm">NPC<select className={input} value={row?.id ?? ""} disabled={!row} onChange={event => { setSelected(event.target.value); setNotice(""); setError(""); }}>
          {!row && <option value="">No NPC questions</option>}
          {available.map(item => <option key={item.id} value={item.id}>NPC {item.number} — {item.npc}{drafts[item.id] ? " (unsaved)" : ""}</option>)}
        </select></label>
      </div>
      {!row && <p className="text-slate-300">This level has no authored NPC question encounters.</p>}
      {row && content && <>
        <p className="text-sm text-slate-300">{row.kind === "order" ? "Arrange four answers in order" : "Multiple choice"} · {row.overridden ? "Custom question" : row.configured ? "Game default" : "Not configured"} · {row.rewardCoins} Gold for a correct answer</p>
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="space-y-1 text-sm">English question<textarea className={input} rows={5} maxLength={1500} value={content.questionEN} onChange={event => change({ ...content, questionEN: event.target.value })} /></label>
          <label className="space-y-1 text-sm">Filipino question<textarea className={input} rows={5} maxLength={1500} value={content.questionTL} onChange={event => change({ ...content, questionTL: event.target.value })} /></label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">{content.choices.map((choice, index) => <label key={index} className="space-y-1 text-sm">Answer {index + 1}
          <input className={input} maxLength={160} value={choice} onChange={event => change({ ...content, choices: content.choices.map((value, i) => i === index ? event.target.value : value) })} />
        </label>)}</div>
        {row.kind === "choice" ? <fieldset className="space-y-2 rounded-xl border border-white/10 bg-black/10 p-4"><legend className="px-1 text-sm font-semibold text-amber-200">Correct answer — select one</legend>
          {content.choices.map((choice, index) => <label key={index} className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5">
            <input type="radio" name={`correct-answer-${row.id}`} value={index} checked={content.correctIndex === index} onChange={() => change({ ...content, correctIndex: index })} className="size-4 accent-amber-300" />
            <span>{index + 1}. {choice || "Empty answer"}</span>
          </label>)}
        </fieldset> : <div><p className="mb-2 text-sm">Correct order (use each answer once)</p><div className="grid gap-3 sm:grid-cols-2">
          {content.answerOrder.map((answer, position) => <label key={position} className="space-y-1 text-sm">Position {position + 1}<select className={input} value={answer} onChange={event => change({ ...content, answerOrder: content.answerOrder.map((value, i) => i === position ? Number(event.target.value) : value) })}>
            {content.choices.map((choice, index) => <option key={index} value={index}>{index + 1}. {choice}</option>)}
          </select></label>)}
        </div></div>}
        <div className="flex flex-wrap gap-3">
          <button type="button" className={`${button} bg-amber-300 font-semibold text-slate-950 hover:bg-amber-200`} disabled={!draft || saving} onClick={() => void save()}>{saving ? "Saving…" : "Save this NPC"}</button>
          <button type="button" className={button} onClick={() => { setDrafts(previous => ({ ...previous, [row.id]: { content: row.defaults, revision: previous[row.id]?.revision ?? row.revision, reset: true } })); setNotice("Default restored in your draft. Save this NPC to apply it."); }}>Restore game default</button>
          <button type="button" className={button} onClick={() => void load(row.id)}>Reload saved question (discard this draft)</button>
        </div>
        {draft && <p className="text-sm text-amber-200">Unsaved changes for this NPC. Switching NPCs keeps drafts while this page stays open.</p>}
      </>}
    </fieldset>}
  </section>;
}
