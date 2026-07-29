import { describe, it, expect } from "vitest";

import { Railway } from "./Railway";

describe("Railway", () => {
    it("getPositionAtX: прямая ось (y=0)", () => {
        const r = new Railway({ name: "R", startX: 0, endX: 10000 });
        expect(r.getPositionAtX(4001901)).toEqual({ x: 4001901, y: 0 });
    });

    it("сеттеры обновляют поля", () => {
        const r = new Railway({ name: "R", startX: 0, endX: 100 });
        r.setName("X");
        r.setStartX(10);
        r.setEndX(200);
        expect([r.name, r.startX, r.endX]).toEqual(["X", 10, 200]);
    });
});
