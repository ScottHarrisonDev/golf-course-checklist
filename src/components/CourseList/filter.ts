/** List filters, in the order the buttons appear. */
export const FILTERS = ['all', 'to-play', 'played'] as const;
export type Filter = (typeof FILTERS)[number];

export const FILTER_LABELS: Record<Filter, string> = {
  all: 'All',
  'to-play': 'To play',
  played: 'Played',
};

/** Shown instead of a blank list when a filter matches no courses. */
export const EMPTY_MESSAGES: Record<Filter, string> = {
  all: 'No courses yet.',
  'to-play': 'Nothing left to play — well done!',
  played: 'No courses played yet.',
};

export function isFilter(value: unknown): value is Filter {
  return typeof value === 'string' && (FILTERS as readonly string[]).includes(value);
}

/** Whether a course with this played status shows under `filter`. */
export function matchesFilter(played: boolean, filter: Filter): boolean {
  if (filter === 'played') return played;
  if (filter === 'to-play') return !played;
  return true;
}

/** How many courses each filter shows, given each course's played status. */
export function filterCounts(statuses: readonly boolean[]): Record<Filter, number> {
  const played = statuses.filter(Boolean).length;
  return { all: statuses.length, 'to-play': statuses.length - played, played };
}
