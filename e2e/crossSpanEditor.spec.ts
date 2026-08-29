import { test, expect, type Page } from "@playwright/test";

/**
 * Панель характеристик поперечин на демо-плане: клик и ПКМ по балке ведут в панель,
 * марка и нагрузка правятся и остаются в модели.
 */

/**
 * Экранные середины поперечин, до которых доходит настоящий клик: не под панелью
 * инструментов и не за краем канвы.
 */
async function crossSpanMidpoints(page: Page): Promise<Array<{ x: number; y: number }>> {
    return page.evaluate(() => {
        const canvas = document.querySelector("svg[data-cursor]")?.getBoundingClientRect();
        if (!canvas) {
            throw new Error("Канва не отрисована");
        }
        const toolbar = document.querySelector("[aria-label='Выделение']")?.closest("div")?.getBoundingClientRect();
        const minX = toolbar ? toolbar.right + 16 : canvas.left + 120;

        return [...document.querySelectorAll<SVGGraphicsElement>("g.crossSpanLayer line")]
            .map((line) => {
                const box = line.getBoundingClientRect();
                return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
            })
            .filter(
                (p) =>
                    p.x > minX && p.x < canvas.right - 16 && p.y > canvas.top + 16 && p.y < canvas.bottom - 16,
            );
    });
}

/**
 * Приближает план так, чтобы балка перестала помещаться в радиус хит-теста своих опор:
 * на общем виде поперечина короче символа опоры, и клик по ней попадает в опору.
 */
async function zoomToCrossSpan(page: Page): Promise<{ x: number; y: number }> {
    const initial = await crossSpanMidpoints(page);
    expect(initial.length).toBeGreaterThan(0);

    await page.mouse.move(initial[0].x, initial[0].y);
    for (let i = 0; i < 8; i++) {
        await page.mouse.wheel(0, -300);
    }

    const zoomed = await crossSpanMidpoints(page);
    expect(zoomed.length).toBeGreaterThan(0);
    return zoomed[0];
}

test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Загрузить демо-план" }).click();
    await expect(page.locator("svg[data-cursor]")).toBeVisible();
});

test("клик по поперечине открывает панель её характеристик", async ({ page }) => {
    const { x, y } = await zoomToCrossSpan(page);
    await page.mouse.click(x, y);

    await expect(page.getByText(/^(Ригель|Гибкая поперечина) №/)).toBeVisible();
    await expect(page.getByText(/^Длина: \d+([.,]\d+)? м$/)).toBeVisible();
    await expect(page.getByRole("textbox", { name: /^Марка/ })).toBeVisible();
    await expect(page.getByLabel("Расчётная нагрузка, кН")).toBeVisible();
});

test("марка и нагрузка вводятся в панели", async ({ page }) => {
    const { x, y } = await zoomToCrossSpan(page);
    await page.mouse.click(x, y);

    await page.getByRole("textbox", { name: /^Марка/ }).fill("ПБСМ-95");
    await page.getByLabel("Расчётная нагрузка, кН").fill("12.5");

    await expect(page.getByRole("textbox", { name: /^Марка/ })).toHaveValue("ПБСМ-95");
    await expect(page.getByLabel("Расчётная нагрузка, кН")).toHaveValue(/12[.,]5/);
});

test("ПКМ по поперечине предлагает её свойства", async ({ page }) => {
    const { x, y } = await zoomToCrossSpan(page);
    await page.mouse.click(x, y, { button: "right" });

    await expect(page.getByText("Поперечина", { exact: true })).toBeVisible();
    await page.getByRole("menuitem", { name: "Свойства поперечины…" }).click();

    await expect(page.getByText(/^(Ригель|Гибкая поперечина) №/)).toBeVisible();
});
