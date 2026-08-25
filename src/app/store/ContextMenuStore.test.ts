import { describe, it, expect } from "vitest";

import { ContextMenuStore } from "./ContextMenuStore";

describe("ContextMenuStore", () => {
    it("закрыт по умолчанию", () => {
        expect(new ContextMenuStore().isOpen).toBe(false);
    });

    it("open запоминает точку курсора, close сбрасывает", () => {
        const store = new ContextMenuStore();

        store.open({ x: 120, y: 40 });
        expect(store.isOpen).toBe(true);
        expect(store.screenPos).toEqual({ x: 120, y: 40 });

        store.close();
        expect(store.isOpen).toBe(false);
        expect(store.screenPos).toBeNull();
    });

    it("хранит копию точки: движение курсора не двигает открытое меню", () => {
        const store = new ContextMenuStore();
        const pos = { x: 10, y: 10 };

        store.open(pos);
        pos.x = 999;

        expect(store.screenPos).toEqual({ x: 10, y: 10 });
    });

    it("повторный open переносит меню в новую точку", () => {
        const store = new ContextMenuStore();

        store.open({ x: 1, y: 2 });
        store.open({ x: 3, y: 4 });

        expect(store.screenPos).toEqual({ x: 3, y: 4 });
    });
});
