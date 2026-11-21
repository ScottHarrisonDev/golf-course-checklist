# Golf Course Checklist

A small personal web app showing golf courses I want to play on an illustrated UK map,
with a checklist of the ones I've played. Built with Astro, step by step, by Claude Code
agents working through the GitHub issues.

Live site: https://scottharrisondev.github.io/golf-course-checklist/

## Development

Needs Node 22.23.4 or later.

```sh
npm ci
npm run dev       # local dev server
npm run check     # TypeScript (strict) via astro check
npm test          # unit tests (Vitest)
npm run build     # static build to dist/
```

Pull requests run check, test and build in GitHub Actions; pushes to `main` also deploy
to GitHub Pages. See `CLAUDE.md` and `docs/` for how the work is planned and split up.
