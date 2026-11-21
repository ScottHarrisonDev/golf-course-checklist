/**
 * Keyboard support for the ARIA tabs pattern (horizontal tab list).
 * ArrowLeft / ArrowRight move to the previous / next tab and wrap round;
 * Home / End go to the first / last tab. Any other key returns null.
 */
export function nextTabIndex(current: number, key: string, count: number): number | null {
  if (count <= 0) return null;
  switch (key) {
    case 'ArrowRight':
      return (current + 1) % count;
    case 'ArrowLeft':
      return (current - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}
