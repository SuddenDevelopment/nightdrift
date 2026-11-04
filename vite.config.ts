import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  define: { 'import.meta.env.VITE_APP_VERSION': JSON.stringify(version) },
  plugins: [{
    name: 'package-version',
    transformIndexHtml: (html: string) => html.replace('%VITE_APP_VERSION%', version),
  }],
  // Unit tests only. Playwright owns tests/e2e so neither runner takes the
  // other's files.
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/e2e/**'],
    environment: 'node',
  },
});
