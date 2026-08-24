import { describe, it, expect } from "vitest";

import { CatenaryPole } from "./CatenaryPole";
import { FixingPoint } from "./FixingPoint";
import { WireLine } from "./WireLine";

const fp = (name: string) => new FixingPoint({ pole: new CatenaryPole({ x: 0, name, trackBindings: [] }) });
const ids = (wl: WireLine) => wl.fixingPoints.map((f) => f.id);

describe("WireLine", () => {
    it("addFixingPoint добавляет в конец", () => {
        const a = fp("a");
        const wl = new WireLine({ wireType: "vl", fixingPoints: [a] });
        const b = fp("b");
        wl.addFixingPoint(b);
        expect(ids(wl)).toEqual([a.id, b.id]);
    });

    it("move/insert/remove делегируют list-операциям", () => {
        const [a, b, c] = [fp("a"), fp("b"), fp("c")];
        const wl = new WireLine({ wireType: "vl", fixingPoints: [a, b, c] });

        wl.moveFixingPoint(b.id, "up");
        expect(ids(wl)).toEqual([b.id, a.id, c.id]);

        const x = fp("x");
        wl.insertFixingPointAfter(a.id, x);
        expect(ids(wl)).toEqual([b.id, a.id, x.id, c.id]);

        wl.removeFixingPoint(x.id);
        expect(ids(wl)).toEqual([b.id, a.id, c.id]);
    });

    it("сеттеры типа и подписи", () => {
        const wl = new WireLine({ wireType: "vl", fixingPoints: [] });
        wl.setWireType("feeding_25");
        wl.setLabel("Ф1");
        expect([wl.wireType, wl.label]).toEqual(["feeding_25", "Ф1"]);
    });
});
