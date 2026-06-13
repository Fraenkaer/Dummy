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

export function addWorkdays(iso: string, workdays: number): string {
  const d = toDate(iso);
  let count = 0;
  while (count < workdays) {
    d.setDate(d.getDate() + 1);
    if (!isWeekend(d)) count++;
  }
  return toIso(d);
}

export function lastWorkday(startIso: string, dauerTage: number): string {
  if (dauerTage <= 0) return startIso;
  return addWorkdays(startIso, dauerTage - 1);
}

export function formatDate(iso?: string): string {
  if (!iso) return '–';
  return toDate(iso).toLocaleDateString('de-DE');
}
