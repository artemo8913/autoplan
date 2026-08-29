import { describe, it, expect } from "vitest";
import { autorun } from "mobx";

import { crossSpanLabel } from "../lib/crossSpanLabel";
import { CatenaryPole } from "./CatenaryPole";
import { CrossSpan } from "./CrossSpan";
import { Railway } from "./Railway";
import { Track } from "./Track";

const a = new CatenaryPole({ x: 0, name: "a", trackBindings: [] });
const b = new CatenaryPole({ x: 100, name: "b", trackBindings: [] });

describe("CrossSpan", () => {
    it("хранит тип и опоры, использует переданный id", () => {
        const cs = new CrossSpan({ id: "cs1", spanType: "rigid", poleA: a, poleB: b });
        expect(cs).toMatchObject({ id: "cs1", spanType: "rigid", poleA: a, poleB: b });
    });

    it("генерирует id, если не задан", () => {
        expect(new CrossSpan({ spanType: "flexible", poleA: a, poleB: b }).id).toBeTruthy();
    });

    it("марка берётся по текущему типу: у жёсткой — ригеля, у гибкой — троса", () => {
        const cs = new CrossSpan({ spanType: "rigid", poleA: a, poleB: b, beamMark: "Р-3", wireMark: "ПБСМ-70" });

        expect(cs.mark).toBe("Р-3");

        cs.setSpanType("flexible");

        expect(cs.mark).toBe("ПБСМ-70");
    });

    it("смена типа не стирает введённые марки", () => {
        const cs = new CrossSpan({ spanType: "rigid", poleA: a, poleB: b, beamMark: "Р-3" });

        cs.setSpanType("flexible");
        cs.setWireMark("М-95");
        cs.setSpanType("rigid");

        expect(cs).toMatchObject({ beamMark: "Р-3", wireMark: "М-95" });
    });

    it("длина считается по положению опор и следует за ними", () => {
        const left = new CatenaryPole({ x: 0, name: "1", trackBindings: [] });
        const right = new CatenaryPole({ x: 30, name: "2", trackBindings: [] });
        const cs = new CrossSpan({ spanType: "flexible", poleA: left, poleB: right });

        expect(cs.length).toBe(30);

        right.setX(50);

        expect(cs.length).toBe(50);
    });

    it("длина в метрах, а не в единицах чертежа: Y растянут по вертикали", () => {
        const railway = new Railway({ name: "Участок", startX: 0, endX: 1000 });
        const track = new Track({ railway, name: "I", startX: 0, endX: 1000, yOffsetMeters: 0 });
        const left = new CatenaryPole({ x: 0, name: "1", trackBindings: [{ track, offsetMeters: -3 }] });
        const right = new CatenaryPole({ x: 0, name: "2", trackBindings: [{ track, offsetMeters: 5 }] });
        const cs = new CrossSpan({ spanType: "rigid", poleA: left, poleB: right });

        // По чертежу между опорами 80 SVG-единиц, по участку — 8 м.
        expect(right.pos.y - left.pos.y).toBe(80);
        expect(cs.length).toBeCloseTo(8, 6);
    });

    it("характеристики наблюдаемы: реакция видит смену марки и нагрузки", () => {
        const cs = new CrossSpan({ spanType: "rigid", poleA: a, poleB: b });
        const seen: Array<string | undefined> = [];
        const dispose = autorun(() => seen.push(cs.mark));

        cs.setBeamMark("Р-5");
        cs.setLoadKn(12.5);
        dispose();

        expect(seen).toEqual([undefined, "Р-5"]);
        expect(cs.loadKn).toBe(12.5);
    });
});

describe("crossSpanLabel", () => {
    it("называет поперечину типом и опорами", () => {
        expect(crossSpanLabel(new CrossSpan({ spanType: "rigid", poleA: a, poleB: b }))).toBe("Ригель №a–№b");
        expect(crossSpanLabel(new CrossSpan({ spanType: "flexible", poleA: a, poleB: b }))).toBe(
            "Гибкая поперечина №a–№b",
        );
    });
});
