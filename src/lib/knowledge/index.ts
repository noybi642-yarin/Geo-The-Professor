// ─── רישום מקורות הידע ─────────────────────────────────────────
// להוספת מקור ידע חדש: צור קובץ נתונים בתיקייה זו והוסף אותו
// למערך שלהלן. הממשק נבנה אוטומטית — אין צורך לגעת ברכיבים.

import { clientDocuments } from "./clientDocuments.ts";
import { financeContract } from "./financeContract.ts";
import { incentives } from "./incentives.ts";
import type { KnowledgeSource } from "./types.ts";

export const KNOWLEDGE_SOURCES: KnowledgeSource[] = [
  financeContract,
  clientDocuments,
  incentives,
];

export function getSource(id: string): KnowledgeSource | undefined {
  return KNOWLEDGE_SOURCES.find((s) => s.id === id);
}

export * from "./types.ts";
export * from "./search.ts";
