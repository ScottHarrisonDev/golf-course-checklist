# Golf Course Checklist — v1 Task Plan

Status: **Agreed** (21 November 2026)
Requirements: `docs/requirements-v1.md` (agreed). Each task below names the features
(F1–F8) whose acceptance criteria it must meet. Visual design: Option C, "Fairway
Modern" (requirements section 3).

Agents run as **local Claude Code sessions, each in its own git worktree** (section 6).
GitHub issues: T01 = #1 … T11 = #11. Changes requested after that are separate issues
(section 8).

---

## 1. How this plan avoids clashes

Agents rarely clash over logic; they clash over **shared files**. So:

1. **Wave 0 is serial.** One agent sets up everything shared: tooling, dependencies,
   config, types, the store, the page layout and a stub file for every component.
2. **After Wave 0, shared files are frozen.** Later tasks only change files they own.
3. **The page is wired up once, in Wave 0.** Every component already exists as a stub
   and is already on the page, so later tasks replace a stub's insides rather than
   editing the page. There's no "integration" task to collide with.
4. **Waves run in order.** Tasks within a wave can run at the same time.

### Frozen after Wave 0

`package.json`, `package-lock.json`, `astro.config.mjs`, `tsconfig.json`,
`vitest.config.ts`, `.github/workflows/*`, `.claude/*`, `src/pages/index.astro`,
`src/layouts/*`, `src/styles/*`, `src/lib/types.ts`, `src/lib/store.ts`,
`src/lib/courses.ts`, `src/lib/courses-client.ts`, `src/lib/map-config.ts`,
`src/content.config.ts`, `src/data/courses.json`, `src/components/icons/*`,
`CLAUDE.md`, `docs/*`.

If a task genuinely needs one of these changed, the agent **stops and says so on the
issue**. The change becomes its own small task, merged before the blocked task carries on.
(Adding courses to `courses.json` is fine at any time outside the plan.)

---

## 2. Contracts (created in T02, used by everything after)

These are the agreements that let tasks run in parallel. Names are fixed; T02 may
refine details, and records any change here.

```ts
// src/lib/types.ts
export type CourseId = string;
export interface Course {
  id: CourseId; name: string; location: string;
  lat: number; lng: number; holes: 9 | 18; url?: string;
}

// src/lib/storage/types.ts — persistence only; swappable for a backend later
export interface PlayedStorage {
  load(): Set<CourseId>;            // never throws
  save(played: Set<CourseId>): void; // never throws
}

// src/lib/store.ts — in-memory state plus change events
export const PLAYED_CHANGE_EVENT = 'golf:played-change';
export interface PlayedChangeDetail { id: CourseId; played: boolean }
export function isPlayed(id: CourseId): boolean;
export function setPlayed(id: CourseId, played: boolean): void; // saves, then dispatches on document
export function playedCount(ids: readonly CourseId[]): number;
export function onPlayedChange(fn: (d: PlayedChangeDetail) => void): () => void; // returns unsubscribe
```

- **Course data on the server:** `getCourses()` in `src/lib/courses.ts` returns the
  validated content collection, sorted A–Z.
- **Course data in the browser:** the page embeds the courses as
  `<script type="application/json" id="courses-data">`; `readCourses()` in
  `src/lib/courses-client.ts` parses it.
- **Map config:** `src/lib/map-config.ts` exports `MAP_BOUNDS` (the lat/lng box the UK
  artwork covers, roughly 49.8°N –8.7°E to 60.9°N 1.8°E) and the artwork URL. The artwork
  is drawn in **Web Mercator** to exactly those bounds, so Leaflet can place it as an
  image overlay and pins line up.
- **Storage choice:** `src/lib/storage/index.ts` exports `createStorage()`. In T02 it
  returns an in-memory version; T03 switches it to localStorage.
- **Tab shown event:** when a tab panel becomes visible, `Tabs` dispatches
  `golf:tab-shown` on that panel (the map needs it to refresh its size).
- **Played icons:** the played icon (green circle with a tick) and unplayed icon (white
  circle with a yellow flag) are shared SVG snippets in
  `src/components/icons/PlayedIcon.astro` so the map and list match exactly.

### Refinements recorded in T02

- **Store:** `setPlayed` does nothing (no save, no event) if the status is unchanged.
  The store loads from `createStorage()` lazily on first use. `initStore(storage?)`
  (re)loads it from a given storage; mainly for tests. Outside a browser (tests,
  server rendering) events go to a private `EventTarget` instead of `document`, so
  nothing throws. Store functions are for browser code: server-rendered markup should
  assume nothing is played.
- **Storage:** `src/lib/storage/memory.ts` exports `createMemoryStorage(initial?)`, for
  tests and as T03's fallback. `src/lib/storage/index.ts` re-exports the
  `PlayedStorage` type.
- **Course data:** `src/lib/courses-client.ts` also exports `COURSES_DATA_ID`
  (`'courses-data'`). `readCourses()` returns `[]` (and logs) rather than throwing if
  the data is missing. Validation lives in `src/content.config.ts` (custom loader:
  missing or duplicate ids, then a strict schema, so a misspelt key such as `wesbite`
  also fails the build).
- **Map config:** `MAP_BOUNDS` is Leaflet-ready: `[[49.8, -8.7], [60.9, 1.8]]`
  (`[[south, west], [north, east]]`). Also exports `MAP_ARTWORK_URL` (string, base path
  included; may be a `data:` URI while the artwork is tiny) and
  `isInMapBounds(lat, lng)`. At 100 SVG units per degree of longitude, the artwork's
  viewBox is `0 0 1050 1968.38`.
- **Played icons:** `src/components/icons/played-icon.ts` exports
  `playedIconSvg(played, size = 24, className = '')`, the same SVG as a string for
  browser code such as Leaflet pins. `PlayedIcon.astro` takes `played`, `size` and
  `class`.
- **Page wiring:** `index.astro` passes `courses` (A–Z) to `ProgressSummary`,
  `CourseMap` and `CourseList`. `Tabs` owns the tab bar **and** both panels: the page
  passes the views as named slots, `<CourseMap slot="map">` and
  `<CourseList slot="list">`. Ids: `tab-map`, `tab-list`, `panel-map`, `panel-list`.
  Panels scroll inside themselves; the page itself never scrolls.
- **Design tokens:** custom properties in `src/styles/tokens.css` (`--color-*`,
  `--space-1`…`--space-6`, `--radius-*`, `--shadow-*`, `--target-min`). Focus ring is
  `--focus-ring-color` (navy; the header sets it to progress green). `global.css`
  provides a `.visually-hidden` class and a reduced-motion reset.

---

## 3. Target file layout (after Wave 0)

```
CLAUDE.md
.gitignore                                (includes .claude/worktrees/)
.claude/settings.json                     (pre-approved commands)
.claude/skills/task/SKILL.md              (the /task skill)
docs/requirements-v1.md, docs/plan-v1.md  (already on main)
.github/workflows/deploy.yml
astro.config.mjs, tsconfig.json, vitest.config.ts, package.json
src/
  content.config.ts
  data/courses.json                       (starter list already on main)
  pages/index.astro
  layouts/BaseLayout.astro
  styles/tokens.css, global.css
  lib/types.ts, courses.ts, courses-client.ts, store.ts, store.test.ts, map-config.ts
  lib/storage/types.ts, index.ts, memory.ts
  assets/map/uk.svg                      (placeholder until T07)
  components/icons/PlayedIcon.astro      (final, frozen)
  components/Tabs/Tabs.astro             (stub)
  components/ProgressSummary/ProgressSummary.astro (stub)
  components/CourseList/CourseList.astro (stub)
  components/CourseMap/CourseMap.astro   (stub)
```

---

## 4. Waves at a glance

| Wave | Task | Issue | Can run alongside | Depends on |
|---|---|---|---|---|
| 0 | T00 Initial commit | — | — | — |
| 0 | T01 Tooling, config and deploy | #1 | — | T00 |
| 0 | T02 Contracts and page skeleton | #2 | — | T01 |
| 1 | T03 localStorage adapter | #3 | T04–T08 | T02 |
| 1 | T04 Bottom tab bar | #4 | T03, T05–T08 | T02 |
| 1 | T05 Progress summary | #5 | T03, T04, T06–T08 | T02 |
| 1 | T06 Course list | #6 | T03–T05, T07, T08 | T02 |
| 1 | T07 UK map artwork | #7 | T03–T06, T08 | T02 |
| 1 | T08 Map setup (Leaflet) | #8 | T03–T07 | T02 |
| 2 | T09 Map pins and detail card | #9 | — | T08 |
| 3 | T10 Accessibility and device review | #10 | — | all above |
| 3 | T11 v1 release check | #11 | — | T10 |

**How many agents?** One agent for Wave 0. In Wave 1 up to six could run at once, but
the real limit is how fast you can review pull requests. **Three at a time** is a
sensible start (e.g. T03 + T05 + T06, then T04 + T07 + T08).

---

## 5. Tasks

Every task follows the same template. "Must not touch" always includes the frozen files
in section 1, even where not repeated. UI tasks follow the Option C design described in
requirements section 3. The GitHub issue for each task holds the full acceptance
criteria.

### T00 — Initial commit (done)
- **Goal:** Give `main` a first commit so pull requests have something to target.
- **Owns:** `README.md`, `.gitignore` (Node/Astro, plus `.claude/worktrees/`).
- Followed by a second direct commit adding `docs/` and the starter
  `src/data/courses.json`, so agents have the requirements, plan and data from the start.

### T01 — Tooling, config and deploy (#1)
- **Goal:** A buildable, testable, deployable empty Astro site, set up for agents.
- **Owns:** `package.json`, `package-lock.json`, `astro.config.mjs`, `tsconfig.json`,
  `vitest.config.ts`, `.github/workflows/deploy.yml`, `CLAUDE.md`, `.claude/*`,
  `src/pages/index.astro` (placeholder heading only), `README.md`, `.gitignore`.
- **Work:**
  - Astro latest stable, exact version pinned; TypeScript strict.
  - Install **all** agreed dependencies now (`leaflet`, `@types/leaflet`, `vitest`) so
    nobody touches `package.json` later.
  - Scripts: `dev`, `build`, `check` (astro check), `test` (vitest run).
  - `site` and `base` set for `https://scottharrisondev.github.io/golf-course-checklist/`.
  - Workflow: on every pull request run check + test + build; on push to `main` also
    deploy to GitHub Pages.
  - `CLAUDE.md`: commands, the conventions in section 6, the frozen-file rule, British
    English, and pointers to the two docs.
  - `.claude/settings.json`: pre-approve `npm install`, `npm ci`, `npm run check`,
    `npm test`, `npm run build`, `npm run dev`, read-only and branch/commit/push git
    commands, and `gh issue view` / `gh pr create`.
  - `.claude/skills/task/SKILL.md`: the `/task <n>` skill (section 6).
- **Criteria:** F8 (all).
- **Verify:** the placeholder page is live at the Pages URL; a pull request shows CI
  passing; `/task` appears in a fresh Claude Code session.
- **Your step:** in the repository's Settings → Pages, set the source to
  "GitHub Actions".

### T02 — Contracts and page skeleton (#2)
- **Goal:** Every shared piece exists and the page is fully wired with stubs.
- **Owns:** everything in section 3 not owned by T01.
- **Work:**
  - Content collection for the existing `src/data/courses.json` with schema validation
    (F7), including lat/lng inside `MAP_BOUNDS`.
  - The contracts in section 2, with the store working against in-memory storage.
  - Unit tests for the store (set/unset, counts, change events, unsubscribe).
  - Design tokens in `tokens.css` from requirements section 3: colours, radii,
    shadows, spacing, focus style. Manrope loaded from Google Fonts in `BaseLayout`
    (weights 500–800, `display=swap`), with a system-font fallback.
  - The shared `PlayedIcon` component (played and unplayed variants).
  - `BaseLayout` and `index.astro`, phone-first: navy header with the heading and
    `ProgressSummary`; then `Tabs` (tab bar first in the source, shown at the bottom of
    the screen with CSS); `CourseMap` and `CourseList` in the two tab panels; the
    embedded courses JSON. The panel area fills the screen between header and tab bar.
  - Each component stub renders something plain and real (e.g. the list stub shows
    course names) so the page works end to end.
  - Placeholder `uk.svg`: a plain rectangle exactly matching `MAP_BOUNDS`.
- **Criteria:** F7 (all); F6 interface criterion; F1 page title and heading.
- **Verify:** check + test + build pass; a deliberately broken course entry fails the
  build with a clear message (then revert it).
- **Review this one closely:** the contracts, layout and design tokens are hard to
  change later.

### T03 — localStorage adapter (#3)
- **Goal:** Played status survives reloads.
- **Owns:** `src/lib/storage/local-storage.ts`, `src/lib/storage/local-storage.test.ts`,
  `src/lib/storage/index.ts`.
- **Work:** implement `PlayedStorage` on localStorage, keyed by course id; switch
  `createStorage()` to it; fall back to in-memory when localStorage throws.
- **Criteria:** F6 (all).
- **Verify:** unit tests cover saving, loading, unknown ids, corrupt data and
  localStorage being unavailable; ticking a course survives a reload.

### T04 — Bottom tab bar (#4)
- **Goal:** Accessible Map / List tabs in a bar at the bottom of the screen.
- **Owns:** `src/components/Tabs/*`.
- **Work:** replace the stub with an ARIA tabs island: icon plus label per tab, mint
  highlight on the selected tab, targets at least 44px, padding for the safe-area inset
  (`env(safe-area-inset-bottom)`); opens on Map; panels stay in the page when hidden so
  the map keeps its state; dispatch `golf:tab-shown` on a panel when it is shown.
- **Criteria:** F1 (tabs, safe area, source order, no reload, map keeps position,
  320px).
- **Verify:** keyboard (Tab, arrow keys), a screen reader announces tab and panel,
  320px width, an iPhone with a home indicator.

### T05 — Progress summary (#5)
- **Goal:** "N of M played" with a progress bar, in the header.
- **Owns:** `src/components/ProgressSummary/*`.
- **Work:** server-render the initial text and `<progress>`; an island updates them on
  `onPlayedChange`.
- **Criteria:** F5 (all).
- **Verify:** updates when courses change (use the browser console or the list once
  T06 is in); "0 of 5 played" on a clean browser.

### T06 — Course list (#6)
- **Goal:** A–Z list of course cards with filters and Played checkboxes.
- **Owns:** `src/components/CourseList/*`.
- **Work:** server-render the list using `PlayedIcon`; island handles filters (All /
  To play / Played with counts, `aria-pressed`), checkboxes call `setPlayed`, and
  re-filters on `onPlayedChange`; empty-state messages; website links open in a new tab.
- **Criteria:** F4 (all).
- **Verify:** keyboard and screen-reader labels; each filter including empty states;
  320px width.

### T07 — UK map artwork (#7)
- **Goal:** The illustrated UK map.
- **Owns:** `src/assets/map/uk.svg`, `docs/map-artwork.md`.
- **Work:** an illustrated SVG of the UK in Web Mercator matching `MAP_BOUNDS` exactly,
  in the flat Option C style (land, fields, woods, water, white roads, from
  requirements section 3), with coastline and county boundaries. Generate it from open
  boundary data (e.g. Natural Earth, public domain) with a one-off script kept
  **outside** the repository, then hand-tidy. `docs/map-artwork.md` records the source,
  licence and how it was made.
- **Criteria:** F2 (artwork looks deliberate at UK and county zoom).
- **Verify:** placed in the map, known towns line up with their lat/lng; file size
  reasonable (aim under ~300 KB).
- **Note:** the most open-ended task. Expect a design back-and-forth in review.

### T08 — Map setup (Leaflet) (#8)
- **Goal:** A zoomable map showing the artwork, without pins yet.
- **Owns:** `src/components/CourseMap/CourseMap.astro`,
  `src/components/CourseMap/map.ts`.
- **Work:** Leaflet with no tile layer; artwork as an image overlay at `MAP_BOUNDS`;
  max bounds and min zoom so the UK can't be lost; + / − buttons styled as in Option C;
  keyboard panning and zoom; fit to all courses on load; no animation under reduced
  motion; refresh size on `golf:tab-shown`. Leaflet's CSS bundled locally, not from a
  CDN.
- **Criteria:** F2 (all except pin criteria).
- **Verify:** pinch and drag on a real phone; keyboard only; reduced-motion setting;
  works with the placeholder rectangle before T07 lands.

### T09 — Map pins and detail card (#9)
- **Goal:** One pin per course and the detail card.
- **Owns:** `src/components/CourseMap/*` (builds on T08).
- **Work:** pins using `PlayedIcon` inside a 44px button; yellow ring on the open pin;
  accessible names with status; bottom-sheet detail card above the tab bar with Played
  checkbox, website link, close button, Escape, focus return; pins update on
  `onPlayedChange`.
- **Criteria:** F2 (pin criteria), F3 (all).
- **Verify:** keyboard to every pin and through the card; ticking in the card updates
  the list and summary, and ticking in the list updates the pin.

### T10 — Accessibility and device review (#10)
- **Goal:** Check the whole app against WCAG 2.2 AA and the device list.
- **Owns:** a findings list on the issue. Fixes go in **small separate pull requests**,
  each owned by the component's folder.
- **Criteria:** non-functional requirements (devices, accessibility).

### T11 — v1 release check (#11)
- **Goal:** Every acceptance criterion ticked on the live site.
- **Owns:** a release checklist on the issue; tag `v1.0.0`.
- **Who:** Scott, with an agent helping run through the list.

---

## 6. How agents run, and conventions

### Running an agent (local Claude Code + worktrees)

- From the main checkout: `git checkout main && git pull`, so new worktrees start from
  the latest merged work.
- Start one terminal per task: `claude --worktree t05-progress`. Each worktree is a
  fresh checkout on its own branch under `.claude/worktrees/`.
- In the session, type `/task 5` (before T01 has landed, paste the starter prompt
  below instead).
- The agent runs `npm ci` in its worktree, does the task, runs check / test / build,
  pushes its branch and opens a pull request with `gh pr create`.
- After the pull request is merged, exit the session and let Claude Code remove the
  worktree.
- Merging closes the issue (`Closes #n`). The `Unblock issues` workflow
  (`.github/workflows/unblock-issues.yml`) then removes the `blocked` label from any
  issue whose "depends on:" issues are all closed, and comments to say so. Keep the
  "depends on: #n" line in issue bodies so it can find them.

### The `/task <n>` skill (created in T01)

Tells the agent to: sync with the latest `main`; read `CLAUDE.md`,
`docs/requirements-v1.md`, the relevant parts of this plan and issue #n
(`gh issue view n`; issues #1–#11 are tasks T01–T11, later issues stand alone); install
dependencies; change only owned files; meet the acceptance criteria; run check, test
and build; push a branch named `task/T0n-<slug>` (or `task/<n>-<slug>` for later
issues); open a pull request that says `Closes #n` and ticks the criteria.

### Starter prompt (until `/task` exists)

> Work on issue #N in ScottHarrisonDev/golf-course-checklist (read it with
> `gh issue view N`). Read `CLAUDE.md` (if it exists), `docs/requirements-v1.md` and
> `docs/plan-v1.md` first. Only change the files the task owns. When the acceptance
> criteria are met and check, test and build pass, push a branch and open a pull
> request that closes #N.

### Conventions for every agent

- **One task = one GitHub issue = one worktree = one branch = one pull request.**
- Branch name: `task/T06-course-list`. Pull request description says `Closes #<issue>`
  and ticks the task's acceptance criteria.
- Only change files listed under **Owns**. If something else needs changing, stop and
  comment on the issue.
- Before opening the pull request: `npm run check`, `npm test` and `npm run build` pass.
- UI tasks: include a screenshot at 375px wide in the pull request.
- Small commits with clear messages; no unrelated tidying.
- British English in the UI and docs.

### Review checklist for each pull request

- Only owned files changed?
- Acceptance criteria actually met (try them, don't just read the ticks)?
- Matches the Option C design?
- CI green?
- Anything unclear? Ask the agent to explain before merging.

---

## 7. Risks and open questions

- **Map artwork (T07)** is the most uncertain task, both in looks and in getting the
  projection to line up. Mitigation: T08 and T09 can be built and merged against the
  placeholder rectangle.
- **Leaflet keyboard support:** Leaflet supports keyboard panning and zoom and focusable
  markers, but details (focus styling, marker names) need checking against WCAG in T08,
  T09 and T10.
- **Stale worktrees:** worktrees branch from `origin/main`; pull `main` before starting
  each wave so agents build on the latest merged work.
- **The Option C mockups live on a claude.ai design canvas** that agents can't open.
  Requirements section 3 describes the essentials; screenshots can be added to
  `docs/design/` if agents need more.

---

## 8. Pre-release changes (after the first look at the live site)

Requested on 21 November 2026, before tagging `v1.0.0`. They are separate GitHub
issues rather than plan tasks: each issue is complete on its own (goal, owned files,
acceptance criteria), and there is no T-number. The requirements were updated first.

| Issue | Change | Owns | Can run alongside | Depends on |
|---|---|---|---|---|
| #28 | Map artwork: whole of Ireland (drawn like the UK), no roads, no France | `src/assets/map/uk.svg`, `src/lib/map-config.ts` (`MAP_BOUNDS`), `docs/map-artwork.md` | #29 | — |
| #29 | Map: amplified pinch, so one pinch zooms out to the whole map | `src/components/CourseMap/map.ts` (+ a new pinch-zoom file in that folder) | #28 | — |

- #28 changes files that are normally frozen; Scott approved this for that issue only.
- The two issues own different files, so they run in parallel. Check the pinch again
  once both are merged, as widening the map changes the whole-map zoom level slightly.
- The release check (#11) now depends on #10, #28 and #29.
