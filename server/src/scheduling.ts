import { ProjektVorgang } from './types.js';

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function toDate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

export function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function nextWorkday(iso: string): string {
  const d = toDate(iso);
  while (isWeekend(d)) d.setDate(d.getDate() + 1);
  return toIso(d);
}

/** Datum, das `workdays` Arbeitstage (Mo–Fr) nach `iso` liegt. */
export function addWorkdays(iso: string, workdays: number): string {
  const d = toDate(iso);
  let count = 0;
  while (count < workdays) {
    d.setDate(d.getDate() + 1);
    if (!isWeekend(d)) count++;
  }
  return toIso(d);
}

/** Letzter belegter Arbeitstag eines Vorgangs (inklusive Starttag). */
export function lastWorkday(startIso: string, dauerTage: number): string {
  if (dauerTage <= 0) return startIso;
  return addWorkdays(startIso, dauerTage - 1);
}

/**
 * Berechnet die Startdaten aller Vorgänge sequenziell neu, beginnend bei
 * `startDatum` (wird ggf. auf den nächsten Werktag verschoben).
 * Mutiert und gibt die nach Reihenfolge sortierte Liste zurück.
 */
export function recalculateSchedule(
  vorgaenge: ProjektVorgang[],
  startDatum: string,
): ProjektVorgang[] {
  const sorted = [...vorgaenge].sort((a, b) => a.reihenfolge - b.reihenfolge);
  let currentStart = nextWorkday(startDatum);
  for (const vorgang of sorted) {
    vorgang.startDatum = currentStart;
    currentStart = addWorkdays(currentStart, vorgang.dauerTage);
  }
  return sorted;
}

/** Enddatum (letzter Arbeitstag) des gesamten Projekts. */
export function projektEndDatum(vorgaenge: ProjektVorgang[]): string | undefined {
  if (vorgaenge.length === 0) return undefined;
  const sorted = [...vorgaenge].sort((a, b) => a.reihenfolge - b.reihenfolge);
  const last = sorted[sorted.length - 1];
  return lastWorkday(last.startDatum, last.dauerTage);
}
