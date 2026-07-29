import { describe, it, expect } from "vitest";

import { ZIGZAG_DRAW_SCALE } from "@/shared/constants";
import { CatenaryType } from "@/shared/types/catenaryTypes";

import { AnchorSection } from "./AnchorSection";
import { CatenaryPole } from "./CatenaryPole";
import { FixingPoint } from "./FixingPoint";
import { Railway } from "./Railway";
import { Track } from "./Track";

// Опора с пустыми tracks → pos = { x, y: 0 }. ТФ без track → endPos = { x, y: pos.y + yOffset }.
const pole = (x: number) => new CatenaryPole({ x, name: String(x), tracks: {} });

const ZZ = 300;
const offset = ZZ * ZIGZAG_DRAW_SCALE; // смещение зигзага в SVG-единицах при дефолтном масштабе

describe("AnchorSection.getCatenaryPoses", () => {
    it("концы АУ возвращают позицию опоры (yOffset/зигзаг игнорируются)", () => {
        const startPole = pole(0);
        const endPole = pole(300);
        const fpStart = new FixingPoint({ pole: startPole, yOffset: 50 });
        const fpEnd = new FixingPoint({ pole: endPole, yOffset: 50 });
        const section = new AnchorSection({ startPole, endPole, fixingPoints: [fpStart, fpEnd] });

        expect(section.getCatenaryPoses()).toEqual([
            { x: 0, y: 0 },
            { x: 300, y: 0 },
        ]);
    });

    it("промежуточные ТФ возвращают точку на проводе (endPos)", () => {
        const startPole = pole(0);
        const endPole = pole(300);
        const section = new AnchorSection({
            startPole,
            endPole,
            fixingPoints: [
                new FixingPoint({ pole: startPole }),
                new FixingPoint({ pole: pole(100), yOffset: 50 }),
                new FixingPoint({ pole: endPole }),
            ],
        });

        expect(section.getCatenaryPoses()).toEqual([
            { x: 0, y: 0 },
            { x: 100, y: 50 },
            { x: 300, y: 0 },
        ]);
    });

    it("применяет зигзаг только внутри overlap-диапазона", () => {
        const startPole = pole(0);
        const endPole = pole(300);
        const section = new AnchorSection({
            startPole,
            endPole,
            fixingPoints: [
                new FixingPoint({ pole: startPole }),
                new FixingPoint({ pole: pole(100), yOffset: 50, zigzagValue: ZZ }), // в диапазоне
                new FixingPoint({ pole: pole(250), yOffset: 50, zigzagValue: ZZ }), // вне диапазона
                new FixingPoint({ pole: endPole }),
            ],
        });

        expect(section.getCatenaryPoses({ start: 50, end: 150 })).toEqual([
            { x: 0, y: 0 },
            { x: 100, y: 50 + offset },
            { x: 250, y: 50 }, // вне диапазона → зигзаг не применён
            { x: 300, y: 0 },
        ]);
    });

    it("в диапазоне, но без zigzagValue → endPos без смещения", () => {
        const startPole = pole(0);
        const endPole = pole(300);
        const section = new AnchorSection({
            startPole,
            endPole,
            fixingPoints: [
                new FixingPoint({ pole: startPole }),
                new FixingPoint({ pole: pole(100), yOffset: 50 }),
                new FixingPoint({ pole: endPole }),
            ],
        });

        expect(section.getCatenaryPoses({ start: 50, end: 150 })[1]).toEqual({ x: 100, y: 50 });
    });

    it("знак зигзага зависит от стороны опоры относительно провода", () => {
        const startPole = pole(0);
        const endPole = pole(300);
        const section = new AnchorSection({
            startPole,
            endPole,
            fixingPoints: [
                new FixingPoint({ pole: startPole }),
                new FixingPoint({ pole: pole(100), yOffset: 50, zigzagValue: ZZ }), // опора выше провода
                new FixingPoint({ pole: pole(200), yOffset: -50, zigzagValue: ZZ }), // опора ниже провода
                new FixingPoint({ pole: endPole }),
            ],
        });

        expect(section.getCatenaryPoses({ start: 50, end: 250 })).toEqual([
            { x: 0, y: 0 },
            { x: 100, y: 50 + offset },
            { x: 200, y: -50 - offset },
            { x: 300, y: 0 },
        ]);
    });

    it("кастомный zigzagDrawScale переопределяет масштаб", () => {
        const startPole = pole(0);
        const endPole = pole(300);
        const section = new AnchorSection({
            startPole,
            endPole,
            fixingPoints: [
                new FixingPoint({ pole: startPole }),
                new FixingPoint({ pole: pole(100), yOffset: 50, zigzagValue: ZZ }),
                new FixingPoint({ pole: endPole }),
            ],
        });

        expect(section.getCatenaryPoses({ start: 50, end: 150 }, 0.04)[1]).toEqual({ x: 100, y: 50 + ZZ * 0.04 });
    });
});

describe("AnchorSection: скалярные мутаторы", () => {
    it("setName / setType", () => {
        const s = new AnchorSection();
        s.setName("АУ-7");
        s.setType(CatenaryType.CS120);
        expect(s.name).toBe("АУ-7");
        expect(s.type).toBe(CatenaryType.CS120);
    });

    it("setStartPole / setEndPole / setPrimaryTrack (включая сброс в undefined)", () => {
        const railway = new Railway({ name: "R", startX: 0, endX: 10000 });
        const track = new Track({ railway, name: "1", startX: 0, endX: 10000, yOffsetMeters: 0 });
        const a = pole(0);
        const b = pole(100);
        const s = new AnchorSection();

        s.setStartPole(a);
        s.setEndPole(b);
        s.setPrimaryTrack(track);
        expect(s.startPole?.id).toBe(a.id);
        expect(s.endPole?.id).toBe(b.id);
        expect(s.primaryTrack?.id).toBe(track.id);

        s.setStartPole(undefined);
        s.setEndPole(undefined);
        s.setPrimaryTrack(undefined);
        expect(s.startPole).toBeUndefined();
        expect(s.endPole).toBeUndefined();
        expect(s.primaryTrack).toBeUndefined();
    });
});

describe("AnchorSection: список ТФ (мутаторы)", () => {
    it("addFixingPoint добавляет в конец", () => {
        const s = new AnchorSection();
        const fp1 = new FixingPoint({ pole: pole(0) });
        const fp2 = new FixingPoint({ pole: pole(100) });
        s.addFixingPoint(fp1);
        s.addFixingPoint(fp2);
        expect(s.fixingPoints.map((f) => f.id)).toEqual([fp1.id, fp2.id]);
    });

    it("moveFixingPoint меняет порядок", () => {
        const fp1 = new FixingPoint({ pole: pole(0) });
        const fp2 = new FixingPoint({ pole: pole(100) });
        const s = new AnchorSection({ fixingPoints: [fp1, fp2] });
        s.moveFixingPoint(fp2.id, "up");
        expect(s.fixingPoints.map((f) => f.id)).toEqual([fp2.id, fp1.id]);
    });

    it("insertFixingPointAfter вставляет после указанного", () => {
        const fp1 = new FixingPoint({ pole: pole(0) });
        const fp2 = new FixingPoint({ pole: pole(100) });
        const mid = new FixingPoint({ pole: pole(50) });
        const s = new AnchorSection({ fixingPoints: [fp1, fp2] });
        s.insertFixingPointAfter(fp1.id, mid);
        expect(s.fixingPoints.map((f) => f.id)).toEqual([fp1.id, mid.id, fp2.id]);
    });

    it("removeFixingPoint удаляет по id", () => {
        const fp1 = new FixingPoint({ pole: pole(0) });
        const fp2 = new FixingPoint({ pole: pole(100) });
        const s = new AnchorSection({ fixingPoints: [fp1, fp2] });
        s.removeFixingPoint(fp1.id);
        expect(s.fixingPoints.map((f) => f.id)).toEqual([fp2.id]);
    });
});
