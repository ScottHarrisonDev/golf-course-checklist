/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

// getViteConfig lets tests resolve Astro's virtual modules and config.
export default getViteConfig({
  test: {
    include: ['src/**/*.test.ts'],
    // No tests exist until T02; don't fail the pipeline before then.
    passWithNoTests: true,
  },
});
