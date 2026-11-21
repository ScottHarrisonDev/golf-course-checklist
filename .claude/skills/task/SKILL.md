---
name: task
description: Work on a Golf Course Checklist plan task end to end, from reading the issue to opening a pull request. Use when the user types /task <n>, where issue #n is task T0n.
argument-hint: <issue number>
---

# /task $ARGUMENTS

Work on task T0$ARGUMENTS (GitHub issue #$ARGUMENTS) in
ScottHarrisonDev/golf-course-checklist. For two-digit numbers the task is T$ARGUMENTS
(e.g. issue #10 = T10).

## 1. Read first

1. `CLAUDE.md`
2. `docs/requirements-v1.md`
3. The task's section in `docs/plan-v1.md` (section 5), plus sections 1, 2 and 6.
4. The issue: `gh issue view $ARGUMENTS`. The issue is the source of truth for
   **Owns**, the work and the acceptance criteria.

If the task depends on work that isn't on this branch yet, stop and say so.

## 2. Set up

Run `npm ci` in this worktree.

## 3. Do the work

- Change **only** the files the task owns. Never edit frozen files (listed in
  `CLAUDE.md`). If something outside your files needs to change, stop and comment on
  the issue explaining what and why, then tell the user.
- Follow the contracts in `docs/plan-v1.md` section 2 and the Option C design in
  `docs/requirements-v1.md` section 3.
- British English. Use `import.meta.env.BASE_URL` for internal links and assets.
- Meet every acceptance criterion in the issue, and try each one rather than assuming.

## 4. Verify

All three must pass:

```sh
npm run check
npm test
npm run build
```

For UI tasks, run the site and take a screenshot at 375px wide.

## 5. Ship

1. Create a branch `task/T0$ARGUMENTS-<short-slug>` (e.g. `task/T06-course-list`).
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
