import { AnalysisReport, CategoryResult } from '../types';

// Free-Nutzer sehen genau diese 3 Kategorien voll — fix, unabhängig von Reihenfolge/Score.
// Gemini gibt den "name" IMMER auf Englisch zurück (Prompt verbietet Übersetzung dieses
// Feldes explizit), daher reichen die englischen Schlüssel — unabhängig von der UI-/Analyse-Sprache.
export const FREE_CATEGORY_NAMES = ['Filler Words', 'Speaking Pace', 'Eye Contact'];

/** Kategorien, die der Nutzer im Report sehen darf (Free: nur die 3 fixen, Pro: alle). */
export function visibleCategories(report: AnalysisReport, isPro: boolean): CategoryResult[] {
  return isPro
    ? report.categories
    : report.categories.filter((c) => FREE_CATEGORY_NAMES.includes(c.name));
}

/** Schwächste sichtbare Kategorie (niedrigster Score), oder null. */
export function weakestVisibleCategory(report: AnalysisReport, isPro: boolean): CategoryResult | null {
  const list = visibleCategories(report, isPro);
  if (list.length === 0) return null;
  return list.reduce((min, c) => (c.score < min.score ? c : min), list[0]);
}

/** Markdown-Auszeichnung (**fett**) für einzeilige Vorschauen entfernen. */
export function plainText(s: string): string {
  return s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\s+/g, ' ').trim();
}
