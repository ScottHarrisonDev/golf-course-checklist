---
name: task
description: Work on a Golf Course Checklist GitHub issue end to end, from reading the issue to opening a pull request. Use when the user types /task <n>, where n is the issue number.
argument-hint: <issue number>
---

# /task $ARGUMENTS

Work on GitHub issue #$ARGUMENTS in ScottHarrisonDev/golf-course-checklist.

- **Issues #1–#11 are plan tasks:** issue #n is task T0n (#10 = T10, #11 = T11), with a
  section in `docs/plan-v1.md` section 5.
- **Issues #12 and later are not plan tasks.** They have no T-number and no section in
  section 5; the issue itself is complete (goal, owned files, acceptance criteria). Some
  are listed in `docs/plan-v1.md` section 8.

## 1. Sync with the latest `main`

Before reading anything, bring this worktree up to date so you build on every merged
task:

```sh
git fetch origin main
git merge --ff-only origin/main
```

If the fast-forward fails (this branch already has its own commits, for example when
resuming a task), don't rebase or reset: stop and tell the user.

## 2. Read first

1. `CLAUDE.md`
2. `docs/requirements-v1.md`, plus `docs/requirements-v1.1.md` if the issue is
   labelled `v1.1`
3. `docs/plan-v1.md` sections 1, 2 and 6, plus the task's section in section 5 for plan
   tasks, or section 8 if the issue is listed there.
4. The issue: `gh issue view $ARGUMENTS`. The issue is the source of truth for
   **Owns**, the work and the acceptance criteria.

If the issue is labelled `blocked`, or the task depends on work that isn't on this
branch yet, stop and say so.

## 3. Set up

Run `npm ci` in this worktree.

## 4. Do the work

- Change **only** the files the task owns. Never edit frozen files (listed in
  `CLAUDE.md`). If something outside your files needs to change, stop and comment on
  the issue explaining what and why, then tell the user.
- Follow the contracts in `docs/plan-v1.md` section 2 and the Option C design in
  `docs/requirements-v1.md` section 3.
- British English. Use `import.meta.env.BASE_URL` for internal links and assets.
- Meet every acceptance criterion in the issue, and try each one rather than assuming.

## 5. Verify

All three must pass:

```sh
npm run check
npm test
npm run build
```

For UI tasks, run the site and take a screenshot at 375px wide.

## 6. Ship

1. Create a branch: `task/T0$ARGUMENTS-<short-slug>` for plan tasks (e.g.
   `task/T06-course-list`), or `task/$ARGUMENTS-<short-slug>` for later issues (e.g.
   `task/28-map-ireland`).
2. Make small commits with clear messages.
3. `git push -u origin <branch>`
4. `gh pr create` against `main` with a description that:
   - starts with `Closes #$ARGUMENTS`;
   - summarises what changed;
   - lists the acceptance criteria as ticked checkboxes (leave unticked, with a reason,
     any that can only be checked after merging);
   - includes the 375px screenshot for UI tasks;
   - notes anything the reviewer should look at closely.
5. Report the pull request URL to the user.
