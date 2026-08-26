import { describe, it, expect } from "vitest";

import { Railway, Track } from "@/entities/catenaryPlanGraphic";

import { SnapService } from "./SnapService";
import { TracksStore } from "../store/TracksStore";

const railway = new Railway({ name: "R", startX: 0, endX: 1000 });
const trackA = new Track({ railway, name: "A", startX: 0, endX: 1000, yOffsetMeters: 0 }); // trackY 0
const trackB = new Track({ railway, name: "B", startX: 0, endX: 1000, yOffsetMeters: 5 }); // trackY 50

const service = new SnapService(new TracksStore([trackA, trackB], railway));

describe("SnapService.calcSnap — опора КС", () => {
    it("находит ближайшие пути сверху и снизу от курсора", () => {
        const snap = service.calcSnap({ x: 500, y: 20 }, { kind: "catenaryPole" })!;

        expect(snap.snappedTo).toBe("track");
        expect(snap.nearbyTracks).toHaveLength(2);
        expect(snap.snappedPos).toEqual({ x: 500, y: 20 });
        expect(snap.magnetDistance).toBe(20); // min(|0-20|, |50-20|)

        const byTrack = Object.fromEntries(snap.nearbyTracks!.map((t) => [t.trackId, t]));
        expect(byTrack[trackA.id].offsetMeters).toBe(2); // (20-0) / 10, опора ниже пути
        expect(byTrack[trackB.id].offsetMeters).toBe(-3); // (20-50) / 10, опора выше пути
    });

    it("ближайший путь идёт первым — он станет главным у опоры", () => {
        const snap = service.calcSnap({ x: 500, y: 40 }, { kind: "catenaryPole" })!;

        // |50-40| = 10 ближе, чем |0-40| = 40
        expect(snap.nearbyTracks!.map((t) => t.trackId)).toEqual([trackB.id, trackA.id]);
    });

    it("нет путей в зоне X → snappedTo none, magnetDistance Infinity", () => {
        const snap = service.calcSnap({ x: 2000, y: 20 }, { kind: "catenaryPole" })!;
        expect(snap.snappedTo).toBe("none");
        expect(snap.nearbyTracks).toEqual([]);
        expect(snap.magnetDistance).toBe(Infinity);
    });
});

describe("SnapService.calcSnap — магнетизм оси габарита", () => {
    it("Y притягивается к ближайшей оси, кратной шагу габарита", () => {
        // курсор на 2.37 м ниже trackA → ось габарита 2.4 м, то есть Y = 24
        const snap = service.calcSnap({ x: 500, y: 23.7 }, { kind: "catenaryPole" })!;

        expect(snap.snappedPos.y).toBe(24);
        expect(snap.gabaritAxis).toEqual({ trackId: trackA.id, axisY: 24, trackY: 0, offsetMeters: 2.4 });
    });

    it("габариты остальных путей считаются от оси, а не от курсора", () => {
        const snap = service.calcSnap({ x: 500, y: 23.7 }, { kind: "catenaryPole" })!;

        const byTrack = Object.fromEntries(snap.nearbyTracks!.map((t) => [t.trackId, t]));
        expect(byTrack[trackA.id].offsetMeters).toBe(2.4);
        expect(byTrack[trackB.id].offsetMeters).toBe(-2.6); // (24 - 50) / 10
    });

    it("габарит меньше половины шага округляется в ноль — опора садится на ось пути", () => {
        const snap = service.calcSnap({ x: 500, y: 0.3 }, { kind: "catenaryPole" })!;

        expect(snap.snappedPos.y).toBe(0);
        expect(snap.nearbyTracks![0].offsetMeters).toBe(0);
    });

    it("без путей рядом Y остаётся курсорным — притягивать не к чему", () => {
        const snap = service.calcSnap({ x: 2000, y: 23.7 }, { kind: "catenaryPole" })!;

        expect(snap.snappedPos.y).toBe(23.7);
        expect(snap.gabaritAxis).toBeUndefined();
    });
});

describe("SnapService.calcSnap — сетка", () => {
    it("опора ВЛ привязывается к сетке с globalY", () => {
        const snap = service.calcSnap({ x: 503, y: 22 }, { kind: "vlPole", vlType: "intermediate" })!;
        expect(snap.snappedTo).toBe("grid");
        expect(snap.globalY).toBe(22);
        expect(snap.snappedPos).toEqual({ x: 503, y: 22 });
    });

    it("прочие сущности — сетка без globalY", () => {
        const snap = service.calcSnap(
            { x: 503, y: 22 },
            { kind: "disconnector", controlType: "manual", phaseCount: 1 },
        )!;
        expect(snap.snappedTo).toBe("grid");
        expect(snap.globalY).toBeUndefined();
    });
});
