/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // CORS_ORIGIN in the backend's .env is http://localhost:5173 — keep this
    // port so the auth flow needs no backend change.
    port: 5173,
    strictPort: true,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      // The app's own source. `ds/` (the vendored design system) and `dev/`
      // (the gallery) are reference material with no unit tests by design, so
      // measuring them would only report noise. The `core/`+`infra/` layers this
      // once named were dissolved into features/ + shared/ during the F0b
      // restructure.
      include: ['src/features/**', 'src/shared/**', 'src/app/**'],
    },
  },
});
