/** Pure helpers for the progress summary, shared by the server render and the island. */

/** The visible summary text, e.g. "3 of 5 played". */
export function progressText(played: number, total: number): string {
  return `${played} of ${total} played`;
}

/**
 * Values for the `<progress>` element. `max` must be above 0 for the bar to be valid, so
 * an empty course list shows an empty bar rather than an indeterminate one.
 */
export function progressValues(played: number, total: number): { value: number; max: number } {
  const max = Math.max(total, 1);
  return { value: Math.min(Math.max(played, 0), max), max };
}
