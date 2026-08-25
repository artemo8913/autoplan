import { test, expect, type Page } from "@playwright/test";

/**
 * Контекстное меню канвы (ПКМ): состав пунктов зависит от выделения, а само
 * выделение подстраивается под точку клика. Проверяется на демо-плане.
 */

interface Point {
    x: number;
    y: number;
}

/**
 * Экранные точки опор КС — локальный (0,0) их групп через getScreenCTM.
 * Отбрасываются те, что попали под панель инструментов (она лежит поверх канвы слева):
 * настоящий клик мышью до них не дойдёт.
 */
async function polePoints(page: Page): Promise<Point[]> {
    return page.evaluate(() => {
        const svg = document.querySelector("svg[data-cursor]");
        if (!svg) {
            throw new Error("Канва не отрисована");
        }
        const canvas = svg.getBoundingClientRect();
        const toolbar = document.querySelector("[aria-label='Выделение']")?.closest("div")?.getBoundingClientRect();
        const minX = toolbar ? toolbar.right + 16 : canvas.left + 120;

        const points: Point[] = [];
        for (const g of document.querySelectorAll<SVGGElement>("g.poleLayer > g")) {
            const matrix = g.getScreenCTM();
            if (!matrix) {
                continue;
            }
            const point = { x: matrix.e, y: matrix.f };
            const insideCanvas =
                point.x > minX &&
                point.x < canvas.right - 16 &&
                point.y > canvas.top + 16 &&
                point.y < canvas.bottom - 16;
            if (insideCanvas) {
                points.push(point);
            }
        }
        return points;
    });
}

async function firstPolePoint(page: Page): Promise<Point> {
    const points = await polePoints(page);
    expect(points.length).toBeGreaterThan(0);
    return points[0];
}

/** Заведомо пустое место: над опорами, где нет ни путей, ни проводов. */
async function emptyPoint(page: Page): Promise<Point> {
    const pole = await firstPolePoint(page);
    return { x: pole.x, y: pole.y - 150 };
}

test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Загрузить демо-план" }).click();
    await expect(page.locator("svg[data-cursor]")).toBeVisible();
});

test("ПКМ по пустому месту открывает меню плана", async ({ page }) => {
    const { x, y } = await emptyPoint(page);
    await page.mouse.click(x, y, { button: "right" });

    await expect(page.getByRole("menuitem", { name: "Вписать план в экран" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Участок и пути…" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: /Удалить/ })).toBeHidden();
});

test("ПКМ по опоре выделяет её и открывает меню опоры", async ({ page }) => {
    const { x, y } = await firstPolePoint(page);
    await page.mouse.click(x, y, { button: "right" });

    await expect(page.getByText("Опора КС", { exact: true })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Свойства опоры…" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: /Удалить/ })).toBeVisible();
});

test("пункт меню доводит действие до конца: свойства опоры открывают панель", async ({ page }) => {
    const { x, y } = await firstPolePoint(page);
    await page.mouse.click(x, y, { button: "right" });
    await page.getByRole("menuitem", { name: "Свойства опоры…" }).click();

    await expect(page.getByRole("menuitem", { name: "Свойства опоры…" })).toBeHidden();
    await expect(page.getByText(/^Опора \d+$/)).toBeVisible();
});

test("удаление из меню спрашивает подтверждение и перечисляет каскад", async ({ page }) => {
    const { x, y } = await firstPolePoint(page);
    await page.mouse.click(x, y, { button: "right" });
    await page.getByRole("menuitem", { name: /Удалить/ }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Будет удалено:")).toBeVisible();
    await expect(dialog.getByText(/опора КС: 1/)).toBeVisible();
});

test("Escape закрывает меню, ничего не выполняя", async ({ page }) => {
    const { x, y } = await firstPolePoint(page);
    await page.mouse.click(x, y, { button: "right" });
    await expect(page.getByRole("menuitem", { name: "Свойства опоры…" })).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(page.getByRole("menuitem", { name: "Свойства опоры…" })).toBeHidden();
    await expect(page.getByRole("dialog")).toBeHidden();
});

test("работа с меню не нарушает strict-mode mobx", async ({ page }) => {
    const problems: string[] = [];
    page.on("console", (msg) => {
        if (msg.type() === "error" || msg.type() === "warning") {
            problems.push(`[console.${msg.type()}] ${msg.text()}`);
        }
    });
    page.on("pageerror", (err) => problems.push(`[pageerror] ${err.message}`));

    // Пока ничего не выделено — меню плана.
    const empty = await emptyPoint(page);
    await page.mouse.click(empty.x, empty.y, { button: "right" });
    await page.getByRole("menuitem", { name: "Вписать план в экран" }).click();

    // Открытие панели двигает канву, поэтому точку опоры считаем заново на каждом шаге.
    const pole = await firstPolePoint(page);
    await page.mouse.click(pole.x, pole.y, { button: "right" });
    await page.getByRole("menuitem", { name: "Свойства опоры…" }).click();

    const poleAgain = await firstPolePoint(page);
    await page.mouse.click(poleAgain.x, poleAgain.y, { button: "right" });
    await page.getByRole("menuitem", { name: "Снять выделение" }).click();

    await expect(page.getByRole("menuitem", { name: "Снять выделение" })).toBeHidden();
    expect(problems, `Найдены сообщения в консоли:\n${problems.join("\n")}`).toEqual([]);
});
