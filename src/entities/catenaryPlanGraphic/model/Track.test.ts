import { describe, it, expect } from "vitest";

import { Railway } from "./Railway";
import { Track, TRACK_SCALE_Y } from "./Track";

const railway = new Railway({ name: "R", startX: 0, endX: 10000 });

describe("Track", () => {
    it("getPositionAtX: y = yOffsetMeters · TRACK_SCALE_Y", () => {
        const t = new Track({ railway, name: "1", startX: 0, endX: 10000, yOffsetMeters: 5 });
        expect(t.getPositionAtX(123)).toEqual({ x: 123, y: 5 * TRACK_SCALE_Y });
    });

    it("directionMultiplier из знака yOffsetMeters", () => {
        expect(new Track({ railway, name: "+", startX: 0, endX: 1, yOffsetMeters: 3 }).directionMultiplier).toBe(1);
        expect(new Track({ railway, name: "-", startX: 0, endX: 1, yOffsetMeters: -3 }).directionMultiplier).toBe(-1);
        expect(new Track({ railway, name: "0", startX: 0, endX: 1, yOffsetMeters: 0 }).directionMultiplier).toBe(1);
    });

    it("setYOffsetMeters обновляет позицию и directionMultiplier", () => {
        const t = new Track({ railway, name: "1", startX: 0, endX: 1, yOffsetMeters: 5 });
        t.setYOffsetMeters(-3);
        expect(t.yOffsetMeters).toBe(-3);
        expect(t.directionMultiplier).toBe(-1);
        expect(t.getPositionAtX(0).y).toBe(-30);
    });

    it("setName / setStartX / setEndX обновляют поля", () => {
        const t = new Track({ railway, name: "1", startX: 0, endX: 100, yOffsetMeters: 0 });
        t.setName("2");
        t.setStartX(10);
        t.setEndX(200);
        expect(t.name).toBe("2");
        expect(t.startX).toBe(10);
        expect(t.endX).toBe(200);
    });
});
