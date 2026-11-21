/**
 * Progress summary island: reads the store and keeps the text and bar in step with
 * every change (from the list, the map or anywhere else).
 */
import { onPlayedChange, playedCount } from '../../lib/store';
import { progressText, progressValues } from './progress';

export function initProgressSummary(root: HTMLElement): () => void {
  const text = root.querySelector<HTMLElement>('[data-progress-text]');
  const bar = root.querySelector<HTMLProgressElement>('progress');
  const ids = parseIds(root.dataset.courseIds);

  function render(): void {
    const played = playedCount(ids);
    const label = progressText(played, ids.length);
    if (text) text.textContent = label;
    if (bar) {
      const { value, max } = progressValues(played, ids.length);
      bar.max = max;
      bar.value = value;
      bar.setAttribute('aria-valuetext', label);
      bar.textContent = label;
    }
  }

  render();
  return onPlayedChange(render);
}

/** The course ids the server wrote into `data-course-ids` (a JSON array). */
function parseIds(raw: string | undefined): string[] {
  try {
    const value: unknown = JSON.parse(raw ?? '[]');
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}
