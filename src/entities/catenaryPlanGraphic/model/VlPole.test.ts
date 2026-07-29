import { describe, it, expect } from "vitest";

import { VlPole } from "./VlPole";

describe("VlPole", () => {
    it("pos = {x, y}", () => {
        const p = new VlPole({ x: 300, y: 50, name: "В1", vlType: "intermediate" });
        expect(p.pos).toEqual({ x: 300, y: 50 });
    });

    it("генерирует id, если не задан", () => {
        const p = new VlPole({ x: 0, y: 0, name: "В1", vlType: "angular" });
        expect(p.id).toBeTruthy();
    });
});
