import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['server/**/*.spec.js'],
    // Cada archivo carga el BFF con su propio entorno (el BFF lee process.env al hacer require)
    pool: 'forks',
    isolate: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage/server',
      reporter: ['text-summary', 'lcov', 'html'],
      include: ['server/**/*.js'],
      exclude: ['server/**/*.spec.js', 'server/test/**'],
      thresholds: { lines: 85, statements: 85, functions: 85, branches: 85 },
    },
  },
});
