/**
 * Course list island: filter buttons, Played checkboxes and keeping the cards in step
 * with the store (including changes made elsewhere, e.g. on the map).
 */
import { isPlayed, onPlayedChange, setPlayed } from '../../lib/store';
import { EMPTY_MESSAGES, filterCounts, isFilter, matchesFilter } from './filter';
import type { Filter } from './filter';

export function initCourseList(root: HTMLElement): () => void {
  const list = root.querySelector<HTMLElement>('[data-list]');
  const cards = Array.from(root.querySelectorAll<HTMLElement>('[data-course-id]'));
  const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-filter]'));
  const empty = root.querySelector<HTMLElement>('[data-empty]');
  const status = root.querySelector<HTMLElement>('[data-status]');

  // Default is All on every visit (not remembered).
  let filter: Filter = 'all';

  const checkboxOf = (card: HTMLElement) =>
    card.querySelector<HTMLInputElement>('input[type="checkbox"]');
  const playedOf = (card: HTMLElement) => card.dataset.played === 'true';

  function showPlayed(card: HTMLElement, played: boolean): void {
    card.dataset.played = String(played);
    const checkbox = checkboxOf(card);
    if (checkbox) checkbox.checked = played;
  }

  /** Where focus goes if the focused card is filtered out: next card, previous card, or the filter. */
  function focusTarget(from: HTMLElement): HTMLElement | null {
    const index = cards.indexOf(from);
    const visible = (card: HTMLElement) => matchesFilter(playedOf(card), filter);
    const next = cards.slice(index + 1).find(visible) ?? cards.slice(0, index).reverse().find(visible);
    return (next && checkboxOf(next)) ?? buttons.find((b) => b.dataset.filter === filter) ?? null;
  }

  function render(): void {
    const active = document.activeElement;
    const focusedCard = cards.find((card) => card.contains(active));
    const refocus =
      focusedCard && !matchesFilter(playedOf(focusedCard), filter) ? focusTarget(focusedCard) : null;

    let shown = 0;
    for (const card of cards) {
      const visible = matchesFilter(playedOf(card), filter);
      card.hidden = !visible;
      if (visible) shown++;
    }

    const counts = filterCounts(cards.map(playedOf));
    for (const button of buttons) {
      const f = button.dataset.filter;
      if (!isFilter(f)) continue;
      button.setAttribute('aria-pressed', String(f === filter));
      const count = button.querySelector('[data-count]');
      if (count) count.textContent = String(counts[f]);
    }

    if (list) list.hidden = shown === 0;
    if (empty) {
      empty.textContent = EMPTY_MESSAGES[filter];
      empty.hidden = shown > 0;
    }

    refocus?.focus();
  }

  function announce(message: string): void {
    if (status) status.textContent = message;
  }

  // Ticking a box goes through the store; the change event below updates the cards.
  for (const card of cards) {
    const id = card.dataset.courseId;
    const checkbox = checkboxOf(card);
    if (!id || !checkbox) continue;
    showPlayed(card, isPlayed(id));
    checkbox.addEventListener('change', () => setPlayed(id, checkbox.checked));
  }

  for (const button of buttons) {
    button.addEventListener('click', () => {
      const f = button.dataset.filter;
      if (!isFilter(f) || f === filter) return;
      filter = f;
      announce('');
      render();
    });
  }

  const unsubscribe = onPlayedChange(({ id, played }) => {
    const card = cards.find((c) => c.dataset.courseId === id);
    if (!card) return;
    showPlayed(card, played);
    render();
    // The card has just left the current filter: say what happened, as it is no longer visible.
    if (card.hidden) {
      const name = card.dataset.courseName ?? 'Course';
      announce(`${name} marked as ${played ? 'played' : 'not played'}.`);
    }
  });

  render();
  return unsubscribe;
}
