import { describe, it, expect } from "vitest";

import { CatenaryPole, Railway, Track } from "@/entities/catenaryPlanGraphic";
import { RelativeSidePosition } from "@/shared/types/catenaryTypes";
import type { AnchorGuyType, GroundingType, PoleMaterial } from "@/shared/types/catenaryTypes";

import { computeBulkPoleValues } from "./computeBulkPoleValues";

const railway = new Railway({ name: "R", startX: 0, endX: 10000 });
const t1 = new Track({ railway, name: "1", startX: 0, endX: 10000, yOffsetMeters: 0 });
const t2 = new Track({ railway, name: "2", startX: 0, endX: 10000, yOffsetMeters: 5 });

interface PoleOpts {
    material?: PoleMaterial;
    anchorGuy?: { type: AnchorGuyType; direction: RelativeSidePosition };
    anchorBrace?: { direction: RelativeSidePosition };
    grounding?: GroundingType;
    tracks?: CatenaryPole["tracks"];
}

function pole(opts: PoleOpts = {}): CatenaryPole {
    const p = new CatenaryPole({
        x: 0,
        name: "1",
        material: opts.material,
        anchorGuy: opts.anchorGuy,
        anchorBrace: opts.anchorBrace,
        tracks: opts.tracks ?? {},
    });
    if (opts.grounding) {
        p.setGrounding(opts.grounding);
    }
    return p;
}

const onTrack = (track: Track, gabarit: number, direction: RelativeSidePosition): CatenaryPole["tracks"] => ({
    [track.id]: { track, gabarit, relativePositionToTrack: direction },
});

describe("computeBulkPoleValues", () => {
    it("пустой список → значения по умолчанию", () => {
        expect(computeBulkPoleValues([])).toEqual({
            material: "concrete",
            anchorGuyType: "none",
            anchorGuyDirection: null,
            anchorBrace: false,
            grounding: "none",
            commonTracks: [],
        });
    });

    it("одинаковые скалярные поля сводятся к значению", () => {
        const a = pole({ material: "metal", grounding: "И" });
        const b = pole({ material: "metal", grounding: "И" });
        const res = computeBulkPoleValues([a, b]);
        expect(res.material).toBe("metal");
        expect(res.grounding).toBe("И");
        expect(res.anchorGuyType).toBe("none");
        expect(res.anchorBrace).toBe(false);
    });

    it("различающиеся скалярные поля → mixed", () => {
        const a = pole({ material: "metal", grounding: "И" });
        const b = pole({ material: "concrete", grounding: "ГДЗ" });
        const res = computeBulkPoleValues([a, b]);
        expect(res.material).toBe("mixed");
        expect(res.grounding).toBe("mixed");
    });

    it("оттяжка: тип и направление при совпадении", () => {
        const guy = { type: "single" as const, direction: RelativeSidePosition.RIGHT };
        const res = computeBulkPoleValues([pole({ anchorGuy: guy }), pole({ anchorGuy: { ...guy } })]);
        expect(res.anchorGuyType).toBe("single");
        expect(res.anchorGuyDirection).toBe(RelativeSidePosition.RIGHT);
    });

    it("оттяжка: одинаковый тип, разные направления → direction mixed", () => {
        const a = pole({ anchorGuy: { type: "single", direction: RelativeSidePosition.RIGHT } });
        const b = pole({ anchorGuy: { type: "single", direction: RelativeSidePosition.LEFT } });
        const res = computeBulkPoleValues([a, b]);
        expect(res.anchorGuyType).toBe("single");
        expect(res.anchorGuyDirection).toBe("mixed");
    });

    it("оттяжка: разные типы (есть/нет) → type mixed, direction null", () => {
        const a = pole({ anchorGuy: { type: "single", direction: RelativeSidePosition.RIGHT } });
        const b = pole();
        const res = computeBulkPoleValues([a, b]);
        expect(res.anchorGuyType).toBe("mixed");
        expect(res.anchorGuyDirection).toBeNull();
    });

    it("anchorBrace: смешанное при наличии у части опор", () => {
        const a = pole({ anchorBrace: { direction: RelativeSidePosition.RIGHT } });
        const b = pole();
        expect(computeBulkPoleValues([a, b]).anchorBrace).toBe("mixed");
    });

    it("commonTracks: только общие пути, с пометкой mixed по габариту", () => {
        // a: t1(габ 5,RIGHT) + t2; b: t1(габ 6,RIGHT). Общий только t1, габариты разные.
        const a = pole({
            tracks: {
                ...onTrack(t1, 5, RelativeSidePosition.RIGHT),
                ...onTrack(t2, 5, RelativeSidePosition.RIGHT),
            },
        });
        const b = pole({ tracks: onTrack(t1, 6, RelativeSidePosition.RIGHT) });

        const res = computeBulkPoleValues([a, b]);
        expect(res.commonTracks).toEqual([{ trackId: t1.id, gabarit: "mixed", direction: RelativeSidePosition.RIGHT }]);
    });

    it("commonTracks: совпадающие габарит и сторона", () => {
        const a = pole({ tracks: onTrack(t1, 5, RelativeSidePosition.RIGHT) });
        const b = pole({ tracks: onTrack(t1, 5, RelativeSidePosition.RIGHT) });
        expect(computeBulkPoleValues([a, b]).commonTracks).toEqual([
            { trackId: t1.id, gabarit: 5, direction: RelativeSidePosition.RIGHT },
        ]);
    });
});
