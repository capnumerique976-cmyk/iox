import { defineConfig, devices } from '@playwright/test';

/**
 * Config Playwright pour IOX Frontend.
 *
 * Stratégie :
 *  - démarre Next.js en mode dev sur le port 3100 (isolé du dev quotidien)
 *  - mocke les appels vers /api/v1/* via page.route() dans chaque test
 *  - pas besoin de backend Nest réel pour les scénarios couverts ici
 *
 * Pour exécuter E2E contre un backend réel, définir BASE_URL et désactiver
 * les mocks dans les tests (variable d'env MOCKED=0).
 */
export default defineConfig({
  testDir: './e2e',
  // Dev server Next.js a une compilation on-demand coûteuse au 1er hit :
  // on garde workers=1 même en local pour éviter le flakiness sur les runs à froid.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  timeout: 30_000,
  expect: { timeout: 5_000 },

  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3100',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: process.env.BASE_URL
    ? undefined
    : [
        // Mock backend pour le SSR des pages publiques /marketplace/*.
        // Next reçoit BACKEND_INTERNAL_URL=127.0.0.1:3199 → les fetch SSR
        // sont proxifiés jusqu'ici. Les tests dashboard utilisent page.route()
        // et interceptent avant que la requête n'atteigne Next.
        {
          command: 'node e2e/helpers/ssr-mock-server.mjs',
          port: 3199,
          reuseExistingServer: !process.env.CI,
          timeout: 30_000,
          stdout: 'pipe',
          stderr: 'pipe',
        },
        {
          command: 'next dev --port 3100',
          port: 3100,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          stdout: 'ignore',
          stderr: 'pipe',
          env: {
            BACKEND_INTERNAL_URL: 'http://127.0.0.1:3199',
            // Les pages SSR (fetchProductBySlug, fetchCatalog…) utilisent publicGet
            // qui fetch `${API_BASE}...`. En SSR Node, fetch relative URL échoue : on
            // force une base absolue vers le mock backend. Les tests dashboard interceptent
            // via page.route('**/api/v1/**') — le glob matche aussi l'URL absolue.
            NEXT_PUBLIC_API_URL: 'http://127.0.0.1:3199/api/v1',
            NEXT_PUBLIC_E2E: '1',
          },
        },
      ],
});
