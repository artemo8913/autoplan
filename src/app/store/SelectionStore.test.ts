import { describe, it, expect } from "vitest";

import { SelectionStore } from "./SelectionStore";

describe("SelectionStore.select (одиночный выбор)", () => {
    it("выбирает один id и тип, заменяя предыдущий выбор", () => {
        const s = new SelectionStore();
        s.select("a", "catenaryPole");
        s.select("b", "vlPole");

        expect(s.selectedIds).toEqual(["b"]);
        expect(s.isSelected("a")).toBe(false);
        expect(s.isSelected("b")).toBe(true);
        expect(s.selectedType).toBe("vlPole");
        expect(s.hasSelection).toBe(true);
        expect(s.firstSelectedId).toBe("b");
    });
});

describe("SelectionStore.toggle", () => {
    it("добавляет, затем убирает id; снятие последнего сбрасывает тип", () => {
        const s = new SelectionStore();
        s.toggle("a", "catenaryPole");
        expect(s.isSelected("a")).toBe(true);
        expect(s.selectedType).toBe("catenaryPole");

        s.toggle("a", "catenaryPole");
        expect(s.isSelected("a")).toBe(false);
        expect(s.hasSelection).toBe(false);
        expect(s.selectedType).toBeNull();
    });

    it("разные типы дают selectedType = mixed, одинаковые — сохраняют тип", () => {
        const s = new SelectionStore();
        s.toggle("a", "catenaryPole");
        s.toggle("b", "catenaryPole");
        expect(s.selectedType).toBe("catenaryPole");

        s.toggle("c", "vlPole");
        expect(s.selectedType).toBe("mixed");
        expect(s.selectedIds).toEqual(["a", "b", "c"]);
    });
});

describe("SelectionStore.setMulti / clear", () => {
    it("setMulti задаёт набор и тип; пустой набор → тип null", () => {
        const s = new SelectionStore();
        s.setMulti(["a", "b"], "catenaryPole");
        expect(s.selectedIds).toEqual(["a", "b"]);
        expect(s.selectedType).toBe("catenaryPole");

        s.setMulti([], "catenaryPole");
        expect(s.hasSelection).toBe(false);
        expect(s.selectedType).toBeNull();
    });

    it("clear сбрасывает выбор и тип", () => {
        const s = new SelectionStore();
        s.select("a", "catenaryPole");
        s.clear();
        expect(s.hasSelection).toBe(false);
        expect(s.firstSelectedId).toBeUndefined();
        expect(s.selectedType).toBeNull();
    });
});
