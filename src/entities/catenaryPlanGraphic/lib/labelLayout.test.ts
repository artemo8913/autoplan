import { describe, it, expect } from "vitest";

import { ZIGZAG_DRAW_SCALE } from "@/shared/constants";
import { RelativeSidePosition } from "@/shared/types/catenaryTypes";

import { AnchorSection } from "../model/AnchorSection";
import { CatenaryPole } from "../model/CatenaryPole";
import { FixingPoint } from "../model/FixingPoint";
import { Junction } from "../model/Junction";
import { Railway } from "../model/Railway";
import { Track } from "../model/Track";
import {
    collectSpanPairs,
    fpDirectionToPole,
    isInOverlap,
    poleLabelDirection,
    poleLabelPos,
    sectionOverlapRanges,
    spanLabelLayout,
    zigzagAnchorPos,
    zigzagDrawOffset,
    zigzagLabelPos,
} from "./labelLayout";

const OFFSETS = {
    poleLabelYOffset: 40,
    spanLabelYOffset: 10,
    zigzagTextXOffset: 8,
    zigzagTextYMultiplier: 4,
};

/** Опора без привязок: pos = { x, y: 0 }. */
const pole = (x: number) => new CatenaryPole({ x, name: String(x), trackBindings: [] });

function trackOf(yOffsetMeters: number): Track {
    const railway = new Railway({ name: "R", startX: 0, endX: 10000 });
    return new Track({ railway, name: "1", startX: 0, endX: 10000, yOffsetMeters });
}

function poleOnTrack(x: number, track: Track, gabarit: number): CatenaryPole {
    return new CatenaryPole({
        x,
        name: String(x),
        trackBindings: [{ track, gabarit, relativePositionToTrack: RelativeSidePosition.LEFT }],
    });
}

describe("fpDirectionToPole", () => {
    it("опора выше провода → -1, ниже → +1", () => {
        // ТФ без пути: endPos = pos.y + yOffset. yOffset > 0 → провод ниже опоры
        expect(fpDirectionToPole(new FixingPoint({ pole: pole(0), yOffset: 50 }))).toBe(-1);
        expect(fpDirectionToPole(new FixingPoint({ pole: pole(0), yOffset: -50 }))).toBe(1);
    });

    it("вырожденный случай (ТФ на уровне опоры) сводится к -1", () => {
        expect(fpDirectionToPole(new FixingPoint({ pole: pole(0), yOffset: 0 }))).toBe(-1);
    });
});

describe("подпись опоры", () => {
    it("сторона подписи — от главного пути; без путей -1", () => {
        expect(poleLabelDirection(pole(0))).toBe(-1);
        expect(poleLabelDirection(poleOnTrack(0, trackOf(5), 3))).toBe(1);
        expect(poleLabelDirection(poleOnTrack(0, trackOf(-5), 3))).toBe(-1);
    });

    it("позиция подписи = позиция опоры + смещение по стороне", () => {
        expect(poleLabelPos(pole(120), OFFSETS)).toEqual({ x: 120, y: -40 });
    });
});

describe("sectionOverlapRanges", () => {
    const sectionWith = (start: number, end: number) =>
        new AnchorSection({ startPole: pole(start), endPole: pole(end) });

    it("возвращает диапазоны обоих сопряжений секции", () => {
        const middle = sectionWith(100, 400);
        const left = sectionWith(0, 150);
        const right = sectionWith(350, 500);

        const junctions = [
            new Junction({ section1: left, section2: middle, type: "insulating" }),
            new Junction({ section1: middle, section2: right, type: "insulating" }),
        ];

        expect(sectionOverlapRanges(middle.id, junctions)).toEqual([
            { start: 100, end: 150 },
            { start: 350, end: 400 },
        ]);
    });

    it("сопряжения чужих секций игнорируются", () => {
        const a = sectionWith(0, 150);
        const b = sectionWith(100, 400);
        const alien = sectionWith(600, 900);
        const junctions = [new Junction({ section1: a, section2: b, type: "insulating" })];

        expect(sectionOverlapRanges(alien.id, junctions)).toEqual([]);
    });

    it("сопряжение без анкерных опор диапазона не даёт", () => {
        const a = new AnchorSection({ startPole: pole(0) });
        const b = sectionWith(100, 400);
        const junctions = [new Junction({ section1: a, section2: b, type: "insulating" })];

        expect(sectionOverlapRanges(b.id, junctions)).toEqual([]);
    });
});

describe("зигзаг", () => {
    const ranges = [{ start: 50, end: 150 }];

    it("isInOverlap проверяет попадание в любой диапазон", () => {
        const two = [
            { start: 0, end: 100 },
            { start: 300, end: 400 },
        ];
        expect(isInOverlap(50, two)).toBe(true);
        expect(isInOverlap(200, two)).toBe(false);
        expect(isInOverlap(400, two)).toBe(true);
        expect(isInOverlap(0, [])).toBe(false);
    });

    it("вне зоны сопряжения смещения нет", () => {
        const fp = new FixingPoint({ pole: pole(250), yOffset: 50, zigzagValue: 300 });
        expect(zigzagDrawOffset(fp, ranges, ZIGZAG_DRAW_SCALE)).toBe(0);
    });

    it("без значения зигзага смещения нет", () => {
        const fp = new FixingPoint({ pole: pole(100), yOffset: 50 });
        expect(zigzagDrawOffset(fp, ranges, ZIGZAG_DRAW_SCALE)).toBe(0);
    });

    it("знак смещения зависит от стороны опоры относительно провода", () => {
        const above = new FixingPoint({ pole: pole(100), yOffset: 50, zigzagValue: 300 });
        const below = new FixingPoint({ pole: pole(100), yOffset: -50, zigzagValue: 300 });

        expect(zigzagDrawOffset(above, ranges, ZIGZAG_DRAW_SCALE)).toBeCloseTo(300 * ZIGZAG_DRAW_SCALE);
        expect(zigzagDrawOffset(below, ranges, ZIGZAG_DRAW_SCALE)).toBeCloseTo(-300 * ZIGZAG_DRAW_SCALE);
    });

    it("символ и подпись считаются от одной точки", () => {
        const fp = new FixingPoint({ pole: pole(100), yOffset: 50, zigzagValue: 300 });
        const offset = zigzagDrawOffset(fp, ranges, ZIGZAG_DRAW_SCALE);

        expect(zigzagAnchorPos(fp, offset)).toEqual({ x: 100, y: 50 + offset });
        expect(zigzagLabelPos(fp, OFFSETS, offset)).toEqual({ x: 108, y: 50 + offset - 4 });
    });
});

describe("collectSpanPairs", () => {
    it("пара соседних ТФ на каждый пролёт", () => {
        const p0 = pole(0);
        const p1 = pole(100);
        const p2 = pole(200);
        const section = new AnchorSection({
            fixingPoints: [
                new FixingPoint({ pole: p0 }),
                new FixingPoint({ pole: p1 }),
                new FixingPoint({ pole: p2 }),
            ],
        });

        const pairs = collectSpanPairs([section]);
        expect(pairs.map((p) => [p.leftFp.pole.x, p.rightFp.pole.x])).toEqual([
            [0, 100],
            [100, 200],
        ]);
    });

    it("общий пролёт двух АУ в зоне сопряжения даёт одну пару", () => {
        const shared1 = pole(100);
        const shared2 = pole(200);
        const s1 = new AnchorSection({
            fixingPoints: [
                new FixingPoint({ pole: pole(0) }),
                new FixingPoint({ pole: shared1 }),
                new FixingPoint({ pole: shared2 }),
            ],
        });
        const s2 = new AnchorSection({
            fixingPoints: [
                new FixingPoint({ pole: shared1 }),
                new FixingPoint({ pole: shared2 }),
                new FixingPoint({ pole: pole(300) }),
            ],
        });

        const pairs = collectSpanPairs([s1, s2]);
        expect(pairs.map((p) => [p.leftFp.pole.x, p.rightFp.pole.x])).toEqual([
            [0, 100],
            [100, 200],
            [200, 300],
        ]);
    });

    it("ключ уникален и стабилен по паре ТФ", () => {
        const fp1 = new FixingPoint({ pole: pole(0) });
        const fp2 = new FixingPoint({ pole: pole(100) });
        const section = new AnchorSection({ fixingPoints: [fp1, fp2] });

        expect(collectSpanPairs([section])[0].key).toBe(`${fp1.id}-${fp2.id}`);
    });
});

describe("spanLabelLayout", () => {
    it("длина и середина пролёта, подпись со стороны опоры", () => {
        const left = new FixingPoint({ pole: pole(0), yOffset: 50 });
        const right = new FixingPoint({ pole: pole(120), yOffset: 50 });

        expect(spanLabelLayout(left, right, OFFSETS)).toEqual({
            spanLength: 120,
            pos: { x: 60, y: 40 }, // провод на y = 50, опора выше → подпись выше провода
        });
    });
});
