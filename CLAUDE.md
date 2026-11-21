# Golf Course Checklist

A phone-first static Astro site: golf courses I want to play on a zoomable illustrated
UK map (Leaflet) and in a list, with a Played checkbox per course and a progress
summary. Played status lives in localStorage. Deployed to GitHub Pages at
https://scottharrisondev.github.io/golf-course-checklist/.

Read these before starting any task:

- `docs/requirements-v1.md`: agreed v1 scope, acceptance criteria (F1–F8), design tokens.
- `docs/plan-v1.md`: the task plan, contracts (section 2), file ownership and conventions.

## Commands

Node ≥22.23.4 (CI uses Node 24).

```sh
npm ci            # install exact locked dependencies
npm run dev       # local dev server
npm run check     # astro check (TypeScript strict)
npm test          # vitest run
npm run build     # static build to dist/
```

`check`, `test` and `build` must all pass before opening a pull request. CI runs all
three on every pull request and deploys on push to `main`.

## Conventions

- **One task = one GitHub issue = one worktree = one branch = one pull request.**
  Issues #1–#11 are plan tasks: issue #n is task T0n (T10 = #10, T11 = #11). Later
  issues are not plan tasks; each one is complete on its own (see `docs/plan-v1.md`
  section 8).
- Branch name: `task/T0n-<slug>` for plan tasks (e.g. `task/T06-course-list`), or
  `task/<n>-<slug>` for later issues (e.g. `task/28-map-ireland`).
- An issue may approve changes to specific frozen files; that approval covers only the
  files it names.
- Pull request description says `Closes #<n>` and ticks the task's acceptance criteria.
  UI tasks include a screenshot at 375px wide.
- **`Closes #<n>` for the task's own issue is the only closing keyword allowed.** GitHub
  closes any issue written after close/closes/closed, fix/fixes/fixed or
  resolve/resolves/resolved (any case) in a pull request description or commit message
  when it merges. Never use those words next to any other issue number. To mention
  other issues, write "issue 8", "see #8", "depends on #8" or "unblocks #9" instead.
  (This has already closed unfinished issues once.)
- **Only change files the task owns** (listed under "Owns" in the issue and plan). If
  something else needs changing, stop and comment on the issue.
- Small commits with clear messages; no unrelated tidying.
- **British English** in the UI, docs and comments (colour, centre, licence).
- No new dependencies. `package.json` is frozen.
- All internal links and assets go through the base path (`import.meta.env.BASE_URL`),
  never a bare `/`.
- Follow the contracts in `docs/plan-v1.md` section 2 and the Option C "Fairway Modern"
  design in `docs/requirements-v1.md` section 3. Target WCAG 2.2 AA.

## Frozen files (after Wave 0)

Do not change these in a task. If one genuinely needs changing, stop and say so on the
issue; the change becomes its own small task.

`package.json`, `package-lock.json`, `astro.config.mjs`, `tsconfig.json`,
`vitest.config.ts`, `.github/workflows/*`, `.claude/*`, `src/pages/index.astro`,
`src/layouts/*`, `src/styles/*`, `src/lib/types.ts`, `src/lib/store.ts`,
`src/lib/courses.ts`, `src/lib/courses-client.ts`, `src/lib/map-config.ts`,
`src/content.config.ts`, `src/data/courses.json`, `src/components/icons/*`,
`CLAUDE.md`, `docs/*`.

(Adding courses to `src/data/courses.json` outside the plan is fine.)

## Starting a task

Run `/task <n>` in a fresh worktree session (`claude --worktree t0n-<slug>`).
