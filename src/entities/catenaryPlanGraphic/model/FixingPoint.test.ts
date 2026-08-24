import { describe, it, expect } from "vitest";

import { CatenaryPole } from "./CatenaryPole";
import { CrossSpan } from "./CrossSpan";
import { FixingPoint } from "./FixingPoint";
import { Railway } from "./Railway";
import { Track } from "./Track";

const railway = new Railway({ name: "R", startX: 0, endX: 10000 });
const pole = (x = 0, name = "5") => new CatenaryPole({ x, name, trackBindings: [] }); // pos {x, 0}

describe("FixingPoint.endPos", () => {
    it("без пути: pos опоры + yOffset по Y", () => {
        const fp = new FixingPoint({ pole: pole(100), yOffset: 20 });
        expect(fp.endPos).toEqual({ x: 100, y: 20 });
    });

    it("с путём: позиция пути на пикетаже опоры", () => {
        const track = new Track({ railway, name: "1", startX: 0, endX: 10000, yOffsetMeters: 5 });
        const fp = new FixingPoint({ pole: pole(100), track, yOffset: 999 }); // yOffset игнорируется при наличии пути
        expect(fp.endPos).toEqual({ x: 100, y: 50 });
    });
});

describe("FixingPoint.startPos", () => {
    it("supportType pole → позиция опоры (консоль от опоры)", () => {
        const fp = new FixingPoint({ pole: pole(100), yOffset: 20 });
        expect(fp.startPos).toEqual({ x: 100, y: 0 });
    });

    it("supportType crossSpan → совпадает с endPos (консоль вырождается)", () => {
        const fp = new FixingPoint({ pole: pole(100), yOffset: 20, supportType: "crossSpan" });
        expect(fp.startPos).toEqual(fp.endPos);
        expect(fp.startPos).toEqual({ x: 100, y: 20 });
    });
});

describe("FixingPoint.supportLabel / poleId", () => {
    it("опора → №имя", () => {
        const fp = new FixingPoint({ pole: pole(0, "7") });
        expect(fp.supportLabel).toBe("№7");
    });

    it("поперечина: Ригель / Поперечина по типу", () => {
        const a = pole(0, "a");
        const b = pole(100, "b");
        const rigid = new CrossSpan({ spanType: "rigid", poleA: a, poleB: b });
        const flexible = new CrossSpan({ spanType: "flexible", poleA: a, poleB: b });
        expect(new FixingPoint({ pole: a, supportType: "crossSpan", crossSpan: rigid }).supportLabel).toBe("Ригель");
        expect(new FixingPoint({ pole: a, supportType: "crossSpan", crossSpan: flexible }).supportLabel).toBe("Поперечина");
    });

    it("poleId возвращает id опоры", () => {
        const p = pole(0, "1");
        expect(new FixingPoint({ pole: p }).poleId).toBe(p.id);
    });
});

describe("FixingPoint сеттеры", () => {
    it("setZigzagValue устанавливает и сбрасывает зигзаг", () => {
        const fp = new FixingPoint({ pole: pole(100) });
        fp.setZigzagValue(300);
        expect(fp.zigzagValue).toBe(300);
        fp.setZigzagValue(undefined);
        expect(fp.zigzagValue).toBeUndefined();
    });

    it("setYOffset меняет endPos (когда пути нет)", () => {
        const fp = new FixingPoint({ pole: pole(100), yOffset: 0 });
        fp.setYOffset(25);
        expect(fp.yOffset).toBe(25);
        expect(fp.endPos).toEqual({ x: 100, y: 25 });
    });

    it("setTrack переключает endPos на позицию пути и обратно", () => {
        const track = new Track({ railway, name: "1", startX: 0, endX: 10000, yOffsetMeters: 5 });
        const fp = new FixingPoint({ pole: pole(100), yOffset: 25 });

        fp.setTrack(track);
        expect(fp.track?.id).toBe(track.id);
        expect(fp.endPos).toEqual({ x: 100, y: 50 });

        fp.setTrack(undefined);
        expect(fp.track).toBeUndefined();
        expect(fp.endPos).toEqual({ x: 100, y: 25 });
    });
});
