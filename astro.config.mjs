// @ts-check
import { defineConfig } from 'astro/config';

// Deployed to GitHub Pages as a project site. Every internal link and asset must
// go through the base path: use import.meta.env.BASE_URL, never a bare "/".
export default defineConfig({
  site: 'https://scottharrisondev.github.io',
  base: '/golf-course-checklist/',
});
