import { describe, it, expect } from "vitest";

import { AnchorSection, CatenaryPole, FixingPoint } from "@/entities/catenaryPlanGraphic";

import { detectJunctions } from "./detectJunctions";

const pole = (x: number) => new CatenaryPole({ x, name: String(x), tracks: {} });
const fpOn = (p: CatenaryPole) => new FixingPoint({ pole: p });

describe("detectJunctions", () => {
    it("находит сопряжение между двумя АУ с общей опорой", () => {
        const shared = pole(100);
        const a = new AnchorSection({ startPole: pole(0), endPole: pole(120), fixingPoints: [fpOn(shared)] });
        const b = new AnchorSection({ startPole: pole(200), endPole: pole(80), fixingPoints: [fpOn(shared)] });

        const junctions = detectJunctions([a, b]);

        expect(junctions).toHaveLength(1);
        expect(junctions[0].type).toBe("non-insulating");
    });

    it("section1 — секция с меньшим startPole.x", () => {
        const shared = pole(100);
        const left = new AnchorSection({ startPole: pole(0), fixingPoints: [fpOn(shared)] });
        const right = new AnchorSection({ startPole: pole(200), fixingPoints: [fpOn(shared)] });

        // порядок аргументов не влияет на упорядочивание результата
        const junctions = detectJunctions([right, left]);

        expect(junctions[0].section1).toBe(left);
        expect(junctions[0].section2).toBe(right);
    });

    it("без общих опор сопряжений нет", () => {
        const a = new AnchorSection({ startPole: pole(0), fixingPoints: [fpOn(pole(10))] });
        const b = new AnchorSection({ startPole: pole(200), fixingPoints: [fpOn(pole(210))] });

        expect(detectJunctions([a, b])).toHaveLength(0);
    });

    it("несколько общих опор у одной пары → одно сопряжение (дедуп)", () => {
        const s1 = pole(100);
        const s2 = pole(110);
        const a = new AnchorSection({ startPole: pole(0), fixingPoints: [fpOn(s1), fpOn(s2)] });
        const b = new AnchorSection({ startPole: pole(200), fixingPoints: [fpOn(s1), fpOn(s2)] });

        expect(detectJunctions([a, b])).toHaveLength(1);
    });

    it("три АУ через общую опору → три попарных сопряжения", () => {
        const shared = pole(100);
        const a = new AnchorSection({ startPole: pole(0), fixingPoints: [fpOn(shared)] });
        const b = new AnchorSection({ startPole: pole(50), fixingPoints: [fpOn(shared)] });
        const c = new AnchorSection({ startPole: pole(90), fixingPoints: [fpOn(shared)] });

        expect(detectJunctions([a, b, c])).toHaveLength(3);
    });
});
