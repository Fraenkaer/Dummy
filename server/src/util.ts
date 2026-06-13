/** Wandelt null/leeren String in undefined um, damit optionale Felder geleert werden können. */
export function clean<T>(value: T | null | undefined | ''): T | undefined {
  return value === null || value === '' || value === undefined ? undefined : value;
}
