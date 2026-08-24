import { describe, it, expect } from "vitest";

import { AnchorSection, CatenaryPole, CrossSpan, FixingPoint, Railway, Track } from "@/entities/catenaryPlanGraphic";
import { RelativeSidePosition } from "@/shared/types/catenaryTypes";
import { CATENARY_POLE_SCALE_Y } from "@/shared/constants";
import { formatOrdinateCompact } from "@/shared/lib/measure";

import { getBulkFpCandidates } from "./bulkFpCandidates";

const railway = new Railway({ name: "R", startX: 0, endX: 10000 });
const primaryTrack = new Track({ railway, name: "1", startX: 0, endX: 10000, yOffsetMeters: 0 });
const auxTrack = new Track({ railway, name: "2", startX: 0, endX: 10000, yOffsetMeters: 0 });

/** Опора на primaryTrack (pos.y неважен для pole-кандидатов). */
const onPrimary = (x: number, name: string) =>
    new CatenaryPole({
        x,
        name,
        trackBindings: [{ track: primaryTrack, gabarit: 5, relativePositionToTrack: RelativeSidePosition.RIGHT }],
    });

/** Опора с заданным pos.y (для поперечин); привязана к auxTrack (offset 0 → trackY 0). */
function poleWithPosY(x: number, posY: number, name = "cs"): CatenaryPole {
    const gabarit = Math.abs(posY) / CATENARY_POLE_SCALE_Y;
    const direction = posY >= 0 ? RelativeSidePosition.RIGHT : RelativeSidePosition.LEFT;
    return new CatenaryPole({
        x,
        name,
        trackBindings: [{ track: auxTrack, gabarit, relativePositionToTrack: direction }],
    });
}

function section(fixingPoints: FixingPoint[] = []) {
    return new AnchorSection({
        startPole: onPrimary(0, "start"),
        endPole: onPrimary(1000, "end"),
        primaryTrack,
        fixingPoints,
    });
}

describe("getBulkFpCandidates — опоры", () => {
    it("берёт опоры на пути в диапазоне, сортирует по X, исключает вне диапазона и не на пути", () => {
        const in1 = onPrimary(200, "in1");
        const in2 = onPrimary(500, "in2");
        const outLeft = onPrimary(-50, "outL");
        const outRight = onPrimary(1500, "outR");
        const offTrack = new CatenaryPole({
            x: 300,
            name: "off",
            trackBindings: [{ track: auxTrack, gabarit: 5, relativePositionToTrack: RelativeSidePosition.RIGHT }],
        });

        const candidates = getBulkFpCandidates(section(), [in2, in1, outLeft, outRight, offTrack], []);

        expect(candidates.map((c) => c.x)).toEqual([200, 500]);
        expect(candidates.every((c) => c.kind === "pole")).toBe(true);
        expect(candidates[0].label).toBe(`Опора №in1 · ${formatOrdinateCompact(200)}`);
    });

    it("исключает опоры, у которых в секции уже есть ТФ", () => {
        const in1 = onPrimary(200, "in1");
        const in2 = onPrimary(500, "in2");
        const existing = new FixingPoint({ pole: in1 }); // supportType "pole" по умолчанию

        const candidates = getBulkFpCandidates(section([existing]), [in1, in2], []);

        expect(candidates.map((c) => c.x)).toEqual([500]);
    });

    it("без startPole/endPole/primaryTrack возвращает пустой список", () => {
        const incomplete = new AnchorSection({ startPole: onPrimary(0, "s"), endPole: onPrimary(1000, "e") }); // нет primaryTrack
        expect(getBulkFpCandidates(incomplete, [onPrimary(200, "x")], [])).toEqual([]);
    });
});

describe("getBulkFpCandidates — поперечины", () => {
    it("берёт поперечину, чья балка пересекает путь и середина в диапазоне", () => {
        const crossing = new CrossSpan({
            spanType: "flexible",
            poleA: poleWithPosY(400, 50, "a"),
            poleB: poleWithPosY(400, -50, "b"),
        });
        const notCrossing = new CrossSpan({
            spanType: "flexible",
            poleA: poleWithPosY(600, 50, "a"),
            poleB: poleWithPosY(600, 100, "b"),
        });
        const outOfRange = new CrossSpan({
            spanType: "rigid",
            poleA: poleWithPosY(1500, 50, "a"),
            poleB: poleWithPosY(1500, -50, "b"),
        });

        const candidates = getBulkFpCandidates(section(), [], [crossing, notCrossing, outOfRange]);

        expect(candidates).toHaveLength(1);
        expect(candidates[0].kind).toBe("crossSpan");
        expect(candidates[0].x).toBe(400);
        expect(candidates[0].crossSpan).toBe(crossing);
        expect(candidates[0].label).toBe(`Поперечина · ${formatOrdinateCompact(400)}`);
    });

    it("исключает поперечину, уже представленную ТФ в секции", () => {
        const crossing = new CrossSpan({
            spanType: "rigid",
            poleA: poleWithPosY(400, 50, "a"),
            poleB: poleWithPosY(400, -50, "b"),
        });
        const existing = new FixingPoint({ pole: crossing.poleA, supportType: "crossSpan", crossSpan: crossing });

        expect(getBulkFpCandidates(section([existing]), [], [crossing])).toEqual([]);
    });
});

describe("getBulkFpCandidates — смешанный результат", () => {
    it("опоры и поперечины объединяются и сортируются по X", () => {
        const poleIn = onPrimary(300, "p");
        const crossing = new CrossSpan({
            spanType: "flexible",
            poleA: poleWithPosY(400, 50, "a"),
            poleB: poleWithPosY(400, -50, "b"),
        });

        const candidates = getBulkFpCandidates(section(), [poleIn], [crossing]);

        expect(candidates.map((c) => [c.kind, c.x])).toEqual([
            ["pole", 300],
            ["crossSpan", 400],
        ]);
    });
});
