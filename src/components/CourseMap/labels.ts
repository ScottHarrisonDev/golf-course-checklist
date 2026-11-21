import type { Course } from '../../lib/types';

/** A pin's accessible name: the course name and its status, e.g. "The Ridge Golf Club, not played". */
export function pinLabel(name: string, played: boolean): string {
  return `${name}, ${played ? 'played' : 'not played'}`;
}

/** The holes chip text: "9 holes" or "18 holes". */
export function holesLabel(holes: Course['holes']): string {
  return `${holes} holes`;
}
