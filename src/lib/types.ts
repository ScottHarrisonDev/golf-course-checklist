/** A course's stable identifier, e.g. "the-ridge". Used as the storage key. */
export type CourseId = string;

/** One golf course, as stored in `src/data/courses.json`. */
export interface Course {
  id: CourseId;
  name: string;
  location: string;
  /** The county, exactly as named in the map artwork, e.g. "Kent". */
  county: string;
  lat: number;
  lng: number;
  holes: 9 | 18;
  url?: string;
}
