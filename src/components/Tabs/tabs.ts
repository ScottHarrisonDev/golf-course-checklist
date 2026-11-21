import { nextTabIndex } from './keyboard';

/** Dispatched on a tab panel when it becomes visible (the map uses it to refresh its size). */
export const TAB_SHOWN_EVENT = 'golf:tab-shown';

/**
 * `<golf-tabs>`: ARIA tabs with automatic activation. Wraps markup rendered by
 * `Tabs.astro` (a `[role=tablist]` of `[role=tab]` buttons, each pointing at its
 * panel with `aria-controls`). Hidden panels get the `hidden` attribute but stay in
 * the page, so the map keeps its zoom and position.
 */
class GolfTabs extends HTMLElement {
  private tabs: HTMLButtonElement[] = [];

  connectedCallback(): void {
    if (this.tabs.length) return;
    this.tabs = Array.from(this.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    const tablist = this.querySelector<HTMLElement>('[role="tablist"]');

    for (const tab of this.tabs) {
      tab.addEventListener('click', () => this.select(tab));
    }

    tablist?.addEventListener('keydown', (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const current = this.tabs.findIndex((t) => t === document.activeElement);
      if (current === -1) return;
      const next = nextTabIndex(current, event.key, this.tabs.length);
      if (next === null) return;
      event.preventDefault();
      const tab = this.tabs[next];
      if (!tab) return;
      this.select(tab);
      tab.focus();
    });
  }

  private select(tab: HTMLButtonElement): void {
    const shown: HTMLElement[] = [];
    for (const t of this.tabs) {
      const selected = t === tab;
      t.setAttribute('aria-selected', String(selected));
      t.tabIndex = selected ? 0 : -1;
      const panel = document.getElementById(t.getAttribute('aria-controls') ?? '');
      if (!panel) continue;
      if (selected && panel.hidden) shown.push(panel);
      panel.hidden = !selected;
    }
    // Dispatch after every panel has its final visibility, so listeners can measure.
    for (const panel of shown) panel.dispatchEvent(new CustomEvent(TAB_SHOWN_EVENT));
  }
}

if (!customElements.get('golf-tabs')) customElements.define('golf-tabs', GolfTabs);
