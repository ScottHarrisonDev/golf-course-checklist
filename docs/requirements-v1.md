# Golf Course Checklist — v1 Requirements

Status: **Agreed** (21 November 2026). Changes to v1 scope should be made here first.
Amended 21 November 2026 after a first look at the live site, before tagging v1.0.0:
whole island of Ireland on the map, no roads, no France, and a stronger pinch zoom
(issues 28 and 29).

v1 is a deliberately small MVP: a phone-first page showing the courses I want to play on
a zoomable illustrated map of the UK and Ireland and in a list, where I can tick off courses I've played and
see my progress. Everything not listed here is out of scope.

---

## 1. Decisions

| Area | Decision | Why |
|---|---|---|
| Primary device | Mostly phone. Design mobile-first; desktop must work well too. | How I'll actually use it. |
| Layout | Two tabs, **Map** and **List**, in a **tab bar at the bottom of the screen**. Opens on Map every visit. | Each view gets the whole phone screen; tabs are within easy thumb reach. |
| Visual design | **Option C, "Fairway Modern"**: navy header, flat greens, rounded cards and pill controls. See section 3. | Chosen from three style options. |
| Font | **Manrope**, loaded from Google Fonts. | Chosen with the visual design. |
| Map coverage | Great Britain and the **whole island of Ireland**, with the Republic of Ireland drawn the same way as the UK. No other countries (no France). Courses can be anywhere on the map. | Room for courses anywhere in the UK and Ireland, not just Kent. |
| Pinch zoom | **Amplified about 2×**, so one comfortable pinch goes from the opening view to the whole map. | A one-to-one pinch needed several pinches to zoom out. |
| Map technology | **Leaflet** with our own illustrated SVG as the base layer. No tiles, no API key. | Pinch/drag zoom, zoom buttons and keyboard support are well tested in Leaflet; hand-building them is fiddly. Adds one runtime dependency (~40 KB). |
| Nearby courses | Handled by zooming in. No clustering in v1. | Kept simple; zoom was chosen over grouping. |
| Played data | Played / not played only. No dates or notes. | MVP. |
| Storage | localStorage, keyed by course id, behind a small module. Per-browser by design. | No backend needed for v1. |
| Keeping views in sync | Small shared store module; changes broadcast with a custom event. | No framework dependency. |
| Backup | **No** export/import in v1. | MVP. |
| Testing | Vitest unit tests for logic (storage, store, data validation). | Fast checks without a browser. |
| Accessibility | WCAG 2.2 AA. | Standard target. |

### Dependencies

- `leaflet` (runtime): map zoom, pan, markers, controls.
- `@types/leaflet` (dev): TypeScript types.
- `vitest` (dev): unit tests.

No other dependencies without discussion. (Manrope comes from Google Fonts, not npm.)

---

## 2. Features and acceptance criteria

Each criterion should be checkable by hand or by a test.

### F1. App shell and tabs

- [ ] Page title and heading read "Golf Course Checklist".
- [ ] Two tabs, **Map** and **List**, each with an icon and a text label, in a tab bar
      fixed to the bottom of the screen. The app opens on Map on every visit.
- [ ] The tab bar stays clear of the phone's home indicator / gesture area
      (safe-area inset) and each tab is at least 44px tall.
- [ ] The progress summary (F5) is visible in the header, whichever tab is open.
- [ ] Tabs follow the ARIA tabs pattern: `tablist`/`tab`/`tabpanel` roles,
      `aria-selected`, arrow keys move between tabs. In the page source the tab bar
      comes **before** the panels (moved to the bottom with CSS), so keyboard and
      screen-reader users reach it first.
- [ ] Switching tabs does not reload the page, and the map keeps its zoom and position
      when you return to it.
- [ ] No horizontal scrolling at 320px wide.

### F2. Map

- [ ] The base layer is our illustrated SVG of Great Britain and the whole island of
      Ireland. No map tiles, no API key, and no map requests to third-party servers at
      runtime.
- [ ] The Republic of Ireland is drawn the same way as the UK (county patchwork, coast,
      boundaries). The map shows no roads and no other countries (no France).
- [ ] The artwork looks deliberate at both whole-map zoom and county zoom (e.g. Kent):
      coastline plus enough detail (such as county boundaries) to orient yourself.
- [ ] On first load the map is zoomed to fit all courses, with padding.
- [ ] Touch: pinch to zoom, drag to pan. Desktop: scroll wheel / trackpad to zoom, drag
      to pan.
- [ ] Pinch zoom is amplified (about 2×): on a phone, one comfortable pinch zooms from
      the opening view out to the whole map. The + / − buttons, keyboard and mouse wheel
      are not amplified.
- [ ] **+ / −** zoom buttons are always visible (single-tap alternative to pinch,
      WCAG 2.5.1 and 2.5.7).
- [ ] Keyboard: the map can be focused; arrow keys pan and + / − zoom.
- [ ] You can't zoom out beyond the whole map or drag the map off-screen.
- [ ] The map position and zoom are **not** remembered between visits.
- [ ] One pin per course, at its lat/lng.
- [ ] Played and unplayed pins differ by **icon as well as colour** (played: green
      circle with a tick; unplayed: white circle with a flag) (WCAG 1.4.1), with at
      least 3:1 contrast against the map (WCAG 1.4.11).
- [ ] Pins have a tap target of at least 24×24px (WCAG 2.5.8), aiming for 44×44px.
- [ ] Each pin is keyboard-focusable and has an accessible name including the course
      name and status, e.g. "The Ridge Golf Club, not played".
- [ ] The pin whose card is open is highlighted.
- [ ] Zoom animations are turned off when the user prefers reduced motion.

### F3. Course detail card

- [ ] Tapping a pin, or pressing Enter on a focused pin, opens a card (a bottom sheet,
      sitting above the tab bar) showing: course name, location, holes ("9 holes" /
      "18 holes"), a website link (only if the course has a `url`) and a **Played**
      checkbox.
- [ ] The website link opens in a new tab, and says so to screen readers.
- [ ] The card closes with a close button, the Escape key, or tapping the map elsewhere.
      Focus returns to the pin.
- [ ] Ticking or unticking Played immediately updates the pin, the list and the
      progress summary.

### F4. Course list

- [ ] Courses are listed A–Z by name, each as a card.
- [ ] Filter buttons: **All / To play / Played**, each showing its count. Default is All
      on every visit (not remembered). The selected filter is exposed to screen readers
      (e.g. `aria-pressed`).
- [ ] Each card shows the played/unplayed icon (as on the map), name, location, holes,
      a website link (if any, opening in a new tab as in F3) and a Played checkbox whose
      accessible label includes the course name.
- [ ] Ticking or unticking a course immediately updates the map, the summary and the
      current filter.
- [ ] Empty filters show a message instead of a blank list, e.g. "No courses played yet"
      or "Nothing left to play — well done!".

### F5. Progress summary

- [ ] Shows "**N of M played**" plus a progress bar, in the header.
- [ ] The bar is a native `<progress>` element (or equivalent) with an accessible label;
      the text means it doesn't rely on the bar alone.
- [ ] Updates immediately when any course is ticked or unticked.
- [ ] Shows "0 of M played" correctly when nothing is played.

### F6. Played status storage

- [ ] Played status is saved to localStorage, keyed by course id, and survives a reload.
- [ ] All reads and writes go through one storage module with a small interface, so it
      can be swapped for a backend later.
- [ ] Courses missing from storage are treated as not played. Ids in storage that no
      longer match a course are ignored.
- [ ] If localStorage is unavailable (e.g. some private browsing modes), the app still
      works for the session and doesn't throw errors.
- [ ] Unit tests cover the above.

### F7. Course data

- [ ] Courses live in one static JSON file in the repository (`src/data/courses.json`),
      with the shape `id`, `name`, `location`, `lat`, `lng`, `holes: 9 | 18`,
      optional `url`.
- [ ] The data is validated at build time using Astro's built-in content collections
      (no extra dependency): required fields present, ids unique, holes is 9 or 18,
      lat/lng inside the map (Great Britain and Ireland). Invalid data fails the build
      with a clear message.
- [ ] Adding a course means editing the JSON file only.

### F8. Build and deploy

- [ ] Pushing to `main` builds and deploys to
      `https://scottharrisondev.github.io/golf-course-checklist/` via GitHub Actions.
- [ ] All internal links and assets respect the `base` path.
- [ ] The build fails if TypeScript (strict) or Vitest fails.

---

## 3. Visual design (Option C, "Fairway Modern")

| Token | Value | Used for |
|---|---|---|
| Navy | `#0F2C3F` | Header background, main text, outlines |
| Slate | `#3C5566` | Secondary text, unselected tabs |
| Played green | `#1C7A47` | Played pins and icons, checkbox accent |
| Progress green | `#7EE0A1` | Progress bar fill (on navy) |
| Selected mint | `#CDEBD8` | Selected tab highlight |
| Flag yellow | `#FFB020` | Flag on unplayed pins, open-pin ring (decoration only, never text) |
| Surface | `#FFFFFF` | Cards, sheet, tab bar |
| Background | `#F2F6F3` | List background |
| Chip | `#E8EFEB` | Chips, Played row in the card |
| Border | `#B8C7BF` / `#E1E8E4` | Unselected filter outlines / dividers |
| Map land | `#DDEFD5`, fields `#CBE6C0`, woods `#B9DCAE` | Map artwork |
| Map water | `#A6D8EE`, rivers `#8CCDEA` | Map artwork (no roads) |

- **Type:** Manrope (Google Fonts), weights 500–800. Headings 800, body 600.
- **Shape:** radius 12px for buttons, 16px for cards and rows, 24px for the bottom
  sheet, fully rounded pills for filters and chips.
- **Depth:** soft navy-tinted shadows on cards, pins and floating controls; no
  gradients.
- **Layout (phone):** navy header with title and progress summary at the top; the map
  or list fills the middle; a white tab bar at the bottom with an icon and label per
  tab. The course detail card is a white bottom sheet (24px top corners) above the tab
  bar, with the course name, location, a holes chip, a Played checkbox row and a
  website button.
- Every text/background pairing must still be checked for 4.5:1 contrast (3:1 for
  large text and UI parts) when implemented.

---

## 4. Non-functional requirements

- **Devices:** checked at 320, 375, 768 and 1280px wide. Latest Safari (iOS),
  Chrome (Android), and desktop Chrome, Firefox and Safari.
- **Accessibility:** WCAG 2.2 AA throughout, including visible focus, 4.5:1 text
  contrast and 3:1 for UI elements.
- **Performance:** fully static output. Client JS limited to Leaflet plus the small
  islands for map, list, tabs and summary. The only third-party request is the
  Google Fonts stylesheet and font files.
- **Language:** British English in the UI.

---

## 5. Out of scope for v1

User accounts, multiple users, syncing between devices, backup export/import, dates or
notes on played courses, course search or import from external APIs, scorecards, pin
clustering, offline/PWA support, dark mode, remembering the selected tab, list filter or
map position between visits.
