import { defineConfig, devices } from "@playwright/test";

/**
 * E2E-каркас (Playwright). Покрывает user-flow и взаимодействие с экраном —
 * то, что осознанно вынесено за рамки unit-тестов (vitest). См. COMMENTS.md → «Тестирование».
 *
 * Запуск: `npm run test:e2e` (поднимет dev-сервер сам).
 */
const PORT = 5173;
const BASE_URL = `http://localhost:${PORT}`;
const isCI = !!process.env.CI;

export default defineConfig({
    testDir: "./e2e",
    fullyParallel: true,
    forbidOnly: isCI,
    retries: isCI ? 2 : 0,
    workers: isCI ? 1 : undefined,
    reporter: isCI ? "github" : "html",
    use: {
        baseURL: BASE_URL,
        trace: "on-first-retry",
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
    ],
    webServer: {
        command: `npm run dev -- --port ${PORT} --strictPort`,
        url: BASE_URL,
        reuseExistingServer: !isCI,
        timeout: 120_000,
    },
});
