import catalog from "./npcQuestionDefaults.json";

export type QuestionContent = {
  questionEN: string;
  questionTL: string;
  choices: string[];
  correctIndex: number;
  answerOrder: number[];
};
export type NPCQuestion = (typeof catalog)[number];
export const NPC_QUESTIONS = catalog;
export const questionField = (id: string) => `npcQuestion_${id}`;

export function validateQuestion(value: unknown, npc: NPCQuestion): QuestionContent {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Enter the question and answers.");
  const data = value as Record<string, unknown>;
  function text(value: unknown, maximum: number, label: string) {
    if (typeof value !== "string" || !value.trim() || value.length > maximum || /[<>\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(value))
      throw new Error(`${label} must contain plain text, up to ${maximum} characters.`);
    return value.trim().replace(/\r\n?/g, "\n");
  }
  const questionEN = text(data.questionEN, 1500, "English question");
  const questionTL = text(data.questionTL, 1500, "Filipino question");
  const count = npc.kind === "order" ? 4 : 3;
  if (!Array.isArray(data.choices) || data.choices.length !== count) throw new Error(`Provide exactly ${count} answers.`);
  const choices = data.choices.map((choice, index) => text(choice, 160, `Answer ${index + 1}`));
  if (new Set(choices.map(choice => choice.toLowerCase())).size !== count) throw new Error("Answers must be different from one another.");
  let correctIndex = -1;
  let answerOrder: number[] = [];
  if (npc.kind === "choice") {
    if (!Number.isInteger(data.correctIndex) || Number(data.correctIndex) < 0 || Number(data.correctIndex) >= count) throw new Error("Select the correct answer.");
    correctIndex = Number(data.correctIndex);
  } else {
    if (!Array.isArray(data.answerOrder) || data.answerOrder.length !== count ||
        data.answerOrder.some(index => !Number.isInteger(index) || index < 0 || index >= count) || new Set(data.answerOrder).size !== count)
      throw new Error("The correct order must use each answer exactly once.");
    answerOrder = [...data.answerOrder];
  }
  return { questionEN, questionTL, choices, correctIndex, answerOrder };
}

export function readQuestion(raw: unknown, npc: NPCQuestion) {
  try {
    if (typeof raw !== "string" || raw.length > 12000) throw new Error();
    const stored = JSON.parse(raw);
    const revision = Number.isSafeInteger(stored.revision) && stored.revision >= 0 ? stored.revision : 0;
    if (stored.reset === true) return { content: npc.defaults, revision, overridden: false };
    return { content: validateQuestion(stored, npc), revision, overridden: true };
  } catch {
    return { content: npc.defaults, revision: 0, overridden: false };
  }
}
