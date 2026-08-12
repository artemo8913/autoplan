import { test, expect, type Page } from "@playwright/test";

/**
 * Регрессия на `configure({ enforceActions: "observed" })` (main.tsx).
 * MobX на нарушение пишет console.warning, приложение не падает — поэтому проверяем
 * чистоту консоли на путях, где запись в observable идёт из сервисов:
 * drag опор КС/ВЛ (DragService), undo/redo, размещение и уход курсора с канвы
 * (PlacementToolService.reset), лассо + групповой drag.
 */

/** Экранные координаты локальных точек (0,0) групп слоя — центры опор. */
async function origins(page: Page, layer: string) {
    return page.evaluate((sel) => {
        return [...document.querySelectorAll(`${sel} > g`)].map((el, i) => {
            const m = (el as SVGGraphicsElement).getScreenCTM()!;
            return { i, x: m.e, y: m.f };
        });
    }, layer);
}

test("нет ошибок mobx strict-mode при drag / размещении / уходе курсора", async ({ page }) => {
    const problems: string[] = [];

    page.on("console", (msg) => {
        if (msg.type() === "error" || msg.type() === "warning") {
            problems.push(`[console.${msg.type()}] ${msg.text()}`);
        }
    });
    page.on("pageerror", (err) => problems.push(`[pageerror] ${err.message}`));

    await page.goto("/");
    await page.getByRole("button", { name: "Загрузить демо-план" }).click();

    const canvas = page.locator("svg[data-cursor]");
    await expect(canvas).toBeVisible();
    await page.locator(".poleLayer > g").first().waitFor();
    const box = (await canvas.boundingBox())!;

    // Демо-план сжат у левого края под тулбаром: pan вправо + зум, иначе клики попадают в тулбар
    await page.getByRole("button", { name: "Перемещение холста" }).click();
    await page.mouse.move(box.x + 700, 400);
    await page.mouse.down();
    await page.mouse.move(box.x + 1150, 400, { steps: 10 });
    await page.mouse.up();
    await page.getByRole("button", { name: "Выделение" }).click();

    await page.mouse.move(box.x + 650, 400);
    for (let i = 0; i < 10; i++) {
        await page.mouse.wheel(0, -120);
        await page.waitForTimeout(30);
    }
    await page.waitForTimeout(300);

    const isFree = (o: { x: number; y: number }) => o.x > box.x + 280 && o.x < box.x + box.width - 420;

    // ── 1. Drag опоры КС: клик (выделение) → зажать и тянуть ──
    // NB: клик по опоре открывает панель редактора и меняет ширину канвы,
    // поэтому экранные координаты пересчитываются после выделения.
    const poleTarget = (await origins(page, ".poleLayer")).find(isFree)!;
    const poleSel = `.poleLayer > g:nth-child(${poleTarget.i + 1})`;
    const poleBefore = await page.locator(poleSel).getAttribute("transform");

    await page.mouse.click(poleTarget.x, poleTarget.y);
    await page.waitForTimeout(400);
    expect(await page.locator(poleSel).getAttribute("class")).toContain("svg-clickable--selected");

    const p = (await origins(page, ".poleLayer"))[poleTarget.i];
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    await page.mouse.move(p.x + 40, p.y, { steps: 10 });
    await page.mouse.up();
    expect(await page.locator(poleSel).getAttribute("transform"), "drag опоры КС меняет координату").not.toBe(
        poleBefore,
    );

    await page.keyboard.press("Control+KeyZ");
    expect(await page.locator(poleSel).getAttribute("transform"), "undo возвращает опору КС").toBe(poleBefore);
    await page.keyboard.press("Control+KeyY");

    // ── 2. Drag опоры ВЛ (тут были прямые мутации vp.x / vp.y) ──
    const vlTarget = (await origins(page, ".vlPoleLayer")).find(isFree)!;
    const vlSel = `.vlPoleLayer > g:nth-child(${vlTarget.i + 1})`;
    const vlBefore = await page.locator(vlSel).getAttribute("transform");

    await page.mouse.click(vlTarget.x, vlTarget.y);
    await page.waitForTimeout(400);

    const v = (await origins(page, ".vlPoleLayer"))[vlTarget.i];
    await page.mouse.move(v.x, v.y);
    await page.mouse.down();
    await page.mouse.move(v.x + 50, v.y + 30, { steps: 10 });
    await page.mouse.up();
    expect(await page.locator(vlSel).getAttribute("transform"), "drag опоры ВЛ меняет координаты").not.toBe(vlBefore);

    await page.keyboard.press("Control+KeyZ");
    expect(await page.locator(vlSel).getAttribute("transform"), "undo возвращает опору ВЛ").toBe(vlBefore);

    // ── 3. Размещение опоры + уход курсора с канвы (PlacementToolService.reset) ──
    const polesCount = await page.locator(".poleLayer > g").count();
    await page.getByRole("button", { name: "Опора КС, бетонная (P)" }).click();
    await page.mouse.move(box.x + 500, box.y + 250, { steps: 5 });
    await page.mouse.move(box.x + 560, box.y + 250, { steps: 5 });
    await expect(page.locator(".placement-preview")).toBeVisible();

    // курсор уходит выше канвы → onMouseLeave → reset() → превью исчезает
    await page.mouse.move(box.x + 560, box.y - 20, { steps: 5 });
    await expect(page.locator(".placement-preview")).toBeHidden();

    // возврат и создание опоры
    await page.mouse.move(box.x + 600, box.y + 250, { steps: 5 });
    await page.mouse.click(box.x + 600, box.y + 250);
    await expect(page.locator(".poleLayer > g")).toHaveCount(polesCount + 1);

    // ── 4. Лассо-выделение + drag группы ──
    await page.getByRole("button", { name: "Выделение" }).click();
    await page.mouse.move(box.x + 300, box.y + 60);
    await page.mouse.down();
    await page.mouse.move(box.x + 700, box.y + box.height - 60, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(300);

    const selectedCount = await page.locator(".svg-clickable--selected").count();
    expect(selectedCount, "лассо должно что-то выделить").toBeGreaterThan(1);

    const g = (await origins(page, ".poleLayer")).find(isFree)!;
    await page.mouse.move(g.x, g.y);
    await page.mouse.down();
    await page.mouse.move(g.x + 30, g.y, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(300);

    expect(problems, `Найдены сообщения в консоли:\n${problems.join("\n")}`).toEqual([]);
});
