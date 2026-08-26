import { describe, it, expect } from "vitest";

import { offsetFromGabarit } from "@/entities/catenaryPlanGraphic";
import { CatenaryPole, Railway, Track } from "@/entities/catenaryPlanGraphic";
import { RelativeSidePosition } from "@/shared/types/catenaryTypes";

import { buildPoleSelectData } from "./poleSelectData";

const railway = new Railway({ name: "R", startX: 0, endX: 10000 });
const track = (name: string) => new Track({ railway, name, startX: 0, endX: 10000, yOffsetMeters: 0 });

function pole(x: number, name: string, ...tracks: Track[]): CatenaryPole {
    const trackBindings = tracks.map((track) => ({
        track,
        offsetMeters: offsetFromGabarit(5, RelativeSidePosition.RIGHT, track.directionMultiplier),
    }));
    return new CatenaryPole({ x, name, trackBindings });
}

describe("buildPoleSelectData", () => {
    it("сортирует по X и форматирует подпись с координатой и путями", () => {
        const t1 = track("1");
        const t2 = track("2");
        const p1 = pole(100, "5", t2); // один путь
        const p2 = pole(50, "3"); // без путей
        const p3 = pole(200, "7", t1, t2); // два пути

        const data = buildPoleSelectData([p1, p2, p3]);

        expect(data.map((d) => d.value)).toEqual([p2.id, p1.id, p3.id]);
        expect(data[0].label).toBe("№3 · 0км0пк+50");
        expect(data[1].label).toBe("№5 · 0км1пк+0 · Путь 2");
        expect(data[2].label).toBe("№7 · 0км2пк+0 · Пути 1/2");
    });

    it("пустой список → пустой результат", () => {
        expect(buildPoleSelectData([])).toEqual([]);
    });
});
