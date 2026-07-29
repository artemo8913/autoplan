import { test, expect } from "@playwright/test";

/**
 * Smoke-тесты основного потока: список планов → открытие редактора.
 * Это шаблон для дальнейших e2e-сценариев (создание плана, размещение опор,
 * привязка проводов и т.п.).
 */
test.describe("Список планов", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
    });

    test("отображает заголовок и кнопки управления", async ({ page }) => {
        await expect(page.getByRole("heading", { name: "Планы контактной сети" })).toBeVisible();
        await expect(page.getByRole("button", { name: "Загрузить демо-план" })).toBeVisible();
        await expect(page.getByRole("button", { name: "+ Новый план" })).toBeVisible();
    });

    test("загрузка демо-плана открывает редактор с canvas", async ({ page }) => {
        await page.getByRole("button", { name: "Загрузить демо-план" }).click();

        // Переход в редактор: список планов скрыт, появился интерактивный SVG-canvas
        await expect(page.getByRole("heading", { name: "Планы контактной сети" })).toBeHidden();
        await expect(page.locator("svg[data-cursor]")).toBeVisible();
    });
});
