import { test, expect, type Page } from "@playwright/test";

/**
 * Границы АУ в панели «Линии» на демо-плане: анкерные опоры предлагаются первыми,
 * обычную опору выбрать можно — она становится анкерной, и об этом сообщает тост.
 */

async function openStartPoleSelect(page: Page) {
    const input = page.getByRole("textbox", { name: "Начальная опора" });
    await input.click();
    const listbox = page.getByRole("listbox");
    await expect(listbox).toBeVisible();
    return { input, listbox };
}

/** Сколько опций открытого списка стоит в группе «Анкерные опоры». */
async function countAnchorOptions(page: Page): Promise<number> {
    return page
        .getByRole("listbox")
        .getByRole("option")
        .evaluateAll(
            (options) =>
                options.filter((o) => o.closest("[class*=group]")?.textContent?.startsWith("Анкерные опоры")).length,
        );
}

test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Загрузить демо-план" }).click();
    await expect(page.locator("svg[data-cursor]")).toBeVisible();

    await page.getByRole("button", { name: "Линии" }).click();
    await page.getByText("АУ-1", { exact: true }).click();
});

test("анкерные опоры идут первой группой списка границ", async ({ page }) => {
    const { listbox } = await openStartPoleSelect(page);

    const anchorsLabel = listbox.getByText("Анкерные опоры", { exact: true });
    const othersLabel = listbox.getByText("Остальные (станет анкерной)", { exact: true });
    await expect(anchorsLabel).toBeVisible();

    const anchorsTop = (await anchorsLabel.boundingBox())!.y;
    const othersTop = (await othersLabel.boundingBox())!.y;
    expect(anchorsTop).toBeLessThan(othersTop);

    // Первая опция списка — граница АУ-1 (№2), она анкерная в демо-плане
    await expect(listbox.getByRole("option").first()).toHaveText(/^№2 · /);
});

test("обычная опора границей: тост и переезд в группу анкерных", async ({ page }) => {
    const { input, listbox } = await openStartPoleSelect(page);
    const anchorCountBefore = await countAnchorOptions(page);
    expect(anchorCountBefore).toBeGreaterThan(0);

    await input.fill("№4 ·");
    await listbox.getByRole("option", { name: /^№4 · / }).click();

    await expect(page.getByText(/Опора №4 не была анкерной — помечена анкерной/)).toBeVisible();
    await expect(input).toHaveValue(/^№4 · /);

    await input.fill("");
    await input.click();
    await expect.poll(() => countAnchorOptions(page)).toBe(anchorCountBefore + 1);
});
