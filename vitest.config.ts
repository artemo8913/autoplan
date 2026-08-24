import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "src"),
        },
    },
    test: {
        environment: "node",
        include: ["src/**/*.{test,spec}.ts"],
        coverage: {
            provider: "v8",
            reporter: ["text", "html"],
            all: true,
            // Покрываем логику (.ts). UI (.tsx), типы, бочки и точки сборки — вне unit-объёма.
            include: ["src/**/*.ts"],
            exclude: [
                "src/**/*.{test,spec}.ts",
                "src/**/*.test-helper.ts",
                "src/**/*.tsx", // UI вне unit-объёма (только логика)
                "src/**/*.d.ts",
                "src/shared/types/**",
                "src/**/index.ts",
                "src/app/compositionRoot.ts",
                "src/app/initMock.ts",
            ],
        },
    },
});
