import { describe, it, expect } from "vitest";

import { InlineEditStore, type InlineEditState } from "./InlineEditStore";

const state: InlineEditState = {
    target: { kind: "poleName", poleId: "p1" },
    screenPos: { x: 10, y: 20 },
    initialValue: "1",
};

describe("InlineEditStore", () => {
    it("изначально ничего не редактируется", () => {
        expect(new InlineEditStore().editing).toBeNull();
    });

    it("startEdit устанавливает состояние редактирования", () => {
        const s = new InlineEditStore();
        s.startEdit(state);
        expect(s.editing).toEqual(state);
    });

    it("cancelEdit и commitEdit сбрасывают редактирование", () => {
        const s = new InlineEditStore();

        s.startEdit(state);
        s.cancelEdit();
        expect(s.editing).toBeNull();

        s.startEdit(state);
        s.commitEdit();
        expect(s.editing).toBeNull();
    });
});
