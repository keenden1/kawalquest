import { NextResponse } from "next/server";
import { getSessionUser, isAdminRole } from "@/lib/auth";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { NPC_QUESTIONS, questionField, readQuestion, validateQuestion } from "@/lib/npcQuestions";

export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
async function authorize() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401, headers });
  if (!isAdminRole(user.role)) return NextResponse.json({ error: "Admin role required." }, { status: 403, headers });
  return null;
}
export async function GET() {
  const denied = await authorize();
  if (denied) return denied;
  try {
    const snapshot = await getAdminDb().collection("adminConfig").doc("flags").get();
    const data = snapshot.data() ?? {};
    return NextResponse.json({ questions: NPC_QUESTIONS.map(npc => ({ ...npc, ...readQuestion(data[questionField(npc.id)], npc) })) }, { headers });
  } catch {
    return NextResponse.json({ error: "Could not load NPC questions. Please retry." }, { status: 503, headers });
  }
}
export async function POST(request: Request) {
  const denied = await authorize();
  if (denied) return denied;
  // Plain JSON and no cross-origin requests; session credentials stay same-origin.
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers });
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return NextResponse.json({ error: "Send JSON content." }, { status: 415, headers });
  const raw = await request.text();
  if (raw.length > 14000) return NextResponse.json({ error: "Question is too large." }, { status: 413, headers });
  let body;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400, headers }); }
  const npc = NPC_QUESTIONS.find(npc => npc.id === body?.id);
  if (!npc || !Number.isSafeInteger(body.revision) || body.revision < 0 || ("reset" in body && typeof body.reset !== "boolean"))
    return NextResponse.json({ error: "Select a valid NPC and reload its latest question." }, { status: 400, headers });
  let content;
  try { content = body.reset === true ? null : validateQuestion(body.content, npc); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid question." }, { status: 400, headers }); }
  try {
    const db = getAdminDb();
    const reference = db.collection("adminConfig").doc("flags");
    const result = await db.runTransaction(async transaction => {
      const snapshot = await transaction.get(reference);
      const current = readQuestion(snapshot.data()?.[questionField(npc.id)], npc);
      if (current.revision !== body.revision) return null;
      const revision = current.revision + 1;
      const stored = content ? { ...content, revision } : { reset: true, revision };
      transaction.set(reference, { [questionField(npc.id)]: JSON.stringify(stored) }, { merge: true });
      return { content: content ?? npc.defaults, revision, overridden: content !== null };
    });
    if (!result) return NextResponse.json({ error: "Another admin changed this question. Reload before saving; your draft has been kept." }, { status: 409, headers });
    return NextResponse.json(result, { headers });
  } catch {
    return NextResponse.json({ error: "Could not save the question. Your draft has been kept." }, { status: 503, headers });
  }
}
