# Golf Course Checklist — v1.1 Requirements

Status: **Agreed** (21 November 2026). Builds on `docs/requirements-v1.md`, which still
applies except where this document changes it. Work starts after `v1.0.0` is tagged.

v1.1 adds two things: **venues with several courses** and **clustering of nearby pins**.

---

## 1. Decisions

| Area | Decision | Why |
|---|---|---|
| Venues | A **venue** (one pin, one card) holds one or more **courses** (one Played checkbox each). | Some venues have several courses, e.g. Poult Wood's 18-hole and 9-hole. |
| Progress | "N of M played" counts **courses**, not venues. | Each course is something to play. |
| Partly played | A venue with some, but not all, courses played has its own **partly played** icon, and appears under both **To play** and **Played**. | It is both. |
| Played storage | Still keyed by **course id**. Existing ids are kept, so nothing already ticked is lost. | No migration of stored data. |
| Clustering | Built in (no new dependency). Nearby pins merge into a numbered cluster; tapping it **zooms in** until they separate. No clusters at maximum zoom. | Keeps full control of style and accessibility. |

No new dependencies.

---

## 2. Features and acceptance criteria

### V1. Venues with several courses (issue 36)

- [ ] Each entry in `src/data/courses.json` is a venue: `id`, `name`, `location`,
      `county`, `lat`, `lng`, optional `url`, and `courses`: a non-empty list of
      `{ id, name?, holes: 9 | 18 }`. A course `name` is required when its venue has
      more than one course. Course ids are unique across all venues.
- [ ] Invalid venue data (no courses, duplicate ids, a missing course name on a
      multi-course venue, plus all the v1 checks) fails the build with a clear message.
- [ ] Existing course ids are unchanged, so played status carries over. Poult Wood
      becomes one venue with `poult-wood-18` ("Main course", 18 holes, new) and
      `poult-wood-9` ("9-hole course", 9 holes, existing).
- [ ] A venue's status is **played** (all its courses), **partly played** (some) or
      **unplayed** (none).
- [ ] **Icons:** played (green circle with a tick), partly played (new; e.g. a
      half-green circle) and unplayed (white circle with a flag) differ by shape or icon
      as well as colour, each with at least 3:1 contrast.
- [ ] **Map:** one pin per venue with its status icon. Accessible name e.g.
      "Poult Wood Golf Centre, 1 of 2 courses played" (one-course venues keep
      "played" / "not played").
- [ ] **Card:** county eyebrow, venue name, location, website link, then one Played
      checkbox per course, labelled with the course name and holes (e.g.
      "Main course · 18 holes"). Each checkbox's accessible name includes the venue and
      course, e.g. "Played: Poult Wood Golf Centre, 9-hole course". A one-course venue
      shows a single "Played" checkbox, as in v1.
- [ ] **List:** one card per venue, A–Z, with its status icon and one checkbox per
      course. Partly played venues appear under both To play and Played. Filter counts
      count venues.
- [ ] **Progress:** counts courses ("N of 6 played" once Poult Wood's 18-hole course is
      added).
- [ ] Ticking a course anywhere (map card or list) immediately updates the pin, the
      list card, the filters and the progress summary.

### V2. Clustering (issue 37)

- [ ] After every zoom or pan, venues whose pins would overlap or sit too close on
      screen (about 48px) are shown as one **cluster**: a navy circle with a white
      number (how many venues), white outline and soft shadow, with a 44px tap target.
- [ ] Tapping a cluster, or pressing Enter on it, zooms in just enough for its pins to
      separate. Reduced motion is respected.
- [ ] No clusters at the maximum zoom; overlapping venues show as individual pins.
- [ ] A cluster is a real button whose accessible name lists its venues, e.g.
      "3 venues: Cobtree Manor Park Golf Course, The Ridge Golf Club, Weald of Kent Golf
      Course. Zoom in". After zooming in, focus moves to the first newly separated pin.
- [ ] If the pin of an open card joins a cluster, the card closes and focus moves
      sensibly.
- [ ] At whole-map zoom the five Kent venues show as one cluster labelled "5".

---

## 3. Out of scope for v1.1

Everything out of scope for v1, plus: per-course dates or notes, spreading
("spiderfying") overlapping pins at maximum zoom, and clusters that show played
progress.
