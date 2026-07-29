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
        expect(byTrack[trackA.id].gabarit).toBe(2); // |0-20| / 10
        expect(byTrack[trackB.id].gabarit).toBe(3); // |50-20| / 10
    });

    it("нет путей в зоне X → snappedTo none, magnetDistance Infinity", () => {
        const snap = service.calcSnap({ x: 2000, y: 20 }, { kind: "catenaryPole" })!;
        expect(snap.snappedTo).toBe("none");
        expect(snap.nearbyTracks).toEqual([]);
        expect(snap.magnetDistance).toBe(Infinity);
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
        const snap = service.calcSnap({ x: 503, y: 22 }, { kind: "building" })!;
        expect(snap.snappedTo).toBe("grid");
        expect(snap.globalY).toBeUndefined();
    });
});
