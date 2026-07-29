import { describe, it, expect } from "vitest";

import { RelativeSidePosition } from "@/shared/types/catenaryTypes";

import { CatenaryPole } from "./CatenaryPole";
import { Railway } from "./Railway";
import { Track } from "./Track";

const railway = new Railway({ name: "R", startX: 0, endX: 10000 });
// trackY = yOffsetMeters * 10. Здесь все треки на оси (trackY = 0), кроме явных.
const track = (name: string, yOffsetMeters = 0) =>
    new Track({ railway, name, startX: 0, endX: 10000, yOffsetMeters });

const bind = (t: Track, gabarit: number, direction: RelativeSidePosition) => ({
    [t.id]: { track: t, gabarit, relativePositionToTrack: direction },
});

describe("CatenaryPole.pos", () => {
    it("без путей y=0", () => {
        const p = new CatenaryPole({ x: 100, name: "1", tracks: {} });
        expect(p.pos).toEqual({ x: 100, y: 0 });
    });

    it("y = trackY + scale·gabarit·(сторона·направление)", () => {
        const t = track("1"); // trackY 0, dirMult +1
        const p = new CatenaryPole({ x: 100, name: "1", tracks: bind(t, 5, RelativeSidePosition.RIGHT) });
        expect(p.pos.y).toBe(50); // 0 + 10*5*(1*1)
    });

    it("сторона LEFT отражает знак", () => {
        const t = track("1");
        const p = new CatenaryPole({ x: 0, name: "1", tracks: bind(t, 5, RelativeSidePosition.LEFT) });
        expect(p.pos.y).toBe(-50);
    });
});

describe("CatenaryPole.primaryGabarit", () => {
    it("габарит первого пути", () => {
        const p = new CatenaryPole({ x: 0, name: "1", tracks: bind(track("1"), 7, RelativeSidePosition.RIGHT) });
        expect(p.primaryGabarit).toBe(7);
    });
    it("0 без путей", () => {
        expect(new CatenaryPole({ x: 0, name: "1", tracks: {} }).primaryGabarit).toBe(0);
    });
});

describe("CatenaryPole.setTrackGabarit / setTrackDirection", () => {
    it("setTrackGabarit меняет позицию", () => {
        const t = track("1");
        const p = new CatenaryPole({ x: 0, name: "1", tracks: bind(t, 5, RelativeSidePosition.RIGHT) });
        p.setTrackGabarit(t.id, 8);
        expect(p.pos.y).toBe(80);
    });

    it("setTrackDirection отражает позицию", () => {
        const t = track("1");
        const p = new CatenaryPole({ x: 0, name: "1", tracks: bind(t, 5, RelativeSidePosition.RIGHT) });
        p.setTrackDirection(t.id, RelativeSidePosition.LEFT);
        expect(p.pos.y).toBe(-50);
    });

    it("игнорирует неизвестный путь", () => {
        const p = new CatenaryPole({ x: 0, name: "1", tracks: {} });
        expect(() => p.setTrackGabarit("nope", 5)).not.toThrow();
        expect(p.pos.y).toBe(0);
    });
});

describe("CatenaryPole.addTrackBinding / removeTrackBinding", () => {
    it("addTrackBinding вычисляет габарит из текущей позиции, не меняя pos (первый путь прежний)", () => {
        const t1 = track("1");
        const p = new CatenaryPole({ x: 0, name: "1", tracks: bind(t1, 5, RelativeSidePosition.RIGHT) }); // pos.y 50
        const t2 = track("2"); // trackY 0
        p.addTrackBinding(t2);
        expect(p.tracks[t2.id].gabarit).toBe(5); // |50 - 0| / 10
        expect(p.pos.y).toBe(50); // считается по первому пути t1
    });

    it("removeTrackBinding удаляет привязку", () => {
        const t1 = track("1");
        const p = new CatenaryPole({ x: 0, name: "1", tracks: bind(t1, 5, RelativeSidePosition.RIGHT) });
        p.removeTrackBinding(t1.id);
        expect(p.tracks[t1.id]).toBeUndefined();
        expect(p.pos.y).toBe(0);
    });
});

describe("CatenaryPole.replaceTrackBinding", () => {
    it("переносит привязку на новый путь, сохраняя габарит/сторону и порядок, пересчитывая pos", () => {
        const t1 = track("1"); // trackY 0
        const p = new CatenaryPole({ x: 0, name: "1", tracks: bind(t1, 5, RelativeSidePosition.RIGHT) });
        const t3 = track("3", 10); // trackY 100
        p.replaceTrackBinding(t1.id, t3);
        expect(p.tracks[t1.id]).toBeUndefined();
        expect(p.tracks[t3.id]).toMatchObject({ gabarit: 5, relativePositionToTrack: RelativeSidePosition.RIGHT });
        expect(p.pos.y).toBe(150); // 100 + 10*5*1
    });

    it("no-op если исходный путь не привязан", () => {
        const t1 = track("1");
        const p = new CatenaryPole({ x: 0, name: "1", tracks: bind(t1, 5, RelativeSidePosition.RIGHT) });
        p.replaceTrackBinding("missing", track("9"));
        expect(Object.keys(p.tracks)).toEqual([t1.id]);
    });

    it("сохраняет прочие привязки и порядок ключей (else-ветка)", () => {
        const t1 = track("1");
        const t2 = track("2");
        const p = new CatenaryPole({
            x: 0,
            name: "1",
            tracks: { ...bind(t1, 5, RelativeSidePosition.RIGHT), ...bind(t2, 3, RelativeSidePosition.RIGHT) },
        });
        const t3 = track("3", 10);
        p.replaceTrackBinding(t2.id, t3);

        expect(Object.keys(p.tracks)).toEqual([t1.id, t3.id]); // t1 на месте, t2→t3 в своей позиции
        expect(p.tracks[t3.id]).toMatchObject({ gabarit: 3, relativePositionToTrack: RelativeSidePosition.RIGHT });
    });

    it("no-op если целевой путь уже привязан", () => {
        const t1 = track("1");
        const t2 = track("2");
        const p = new CatenaryPole({
            x: 0,
            name: "1",
            tracks: { ...bind(t1, 5, RelativeSidePosition.RIGHT), ...bind(t2, 3, RelativeSidePosition.RIGHT) },
        });
        p.replaceTrackBinding(t1.id, t2);
        expect(Object.keys(p.tracks)).toEqual([t1.id, t2.id]);
    });
});

describe("CatenaryPole: скалярные сеттеры", () => {
    it("setX / setName / setMaterial / setGrounding / setIsInsulatingJunctionAnchor", () => {
        const p = new CatenaryPole({ x: 0, name: "1", tracks: {} });
        p.setX(500);
        p.setName("12");
        p.setMaterial("metal");
        p.setGrounding("И");
        p.setIsInsulatingJunctionAnchor(true);

        expect(p.x).toBe(500);
        expect(p.pos.x).toBe(500);
        expect(p.name).toBe("12");
        expect(p.material).toBe("metal");
        expect(p.grounding).toBe("И");
        expect(p.isInsulatingJunctionAnchor).toBe(true);
    });

    it("setAnchorGuy / setAnchorBrace задаются и сбрасываются", () => {
        const p = new CatenaryPole({ x: 0, name: "1", tracks: {} });

        p.setAnchorGuy({ type: "single", direction: RelativeSidePosition.RIGHT });
        expect(p.anchorGuy).toEqual({ type: "single", direction: RelativeSidePosition.RIGHT });
        p.setAnchorGuy(undefined);
        expect(p.anchorGuy).toBeUndefined();

        p.setAnchorBrace({ direction: RelativeSidePosition.LEFT });
        expect(p.anchorBrace).toEqual({ direction: RelativeSidePosition.LEFT });
        p.setAnchorBrace(undefined);
        expect(p.anchorBrace).toBeUndefined();
    });

    it("setTracks заменяет весь словарь привязок", () => {
        const t = track("1");
        const p = new CatenaryPole({ x: 0, name: "1", tracks: {} });
        p.setTracks(bind(t, 5, RelativeSidePosition.RIGHT));
        expect(p.primaryGabarit).toBe(5);
        expect(p.pos.y).toBe(50);
    });

    it("setTrackDirection игнорирует неизвестный путь", () => {
        const p = new CatenaryPole({ x: 0, name: "1", tracks: {} });
        expect(() => p.setTrackDirection("nope", RelativeSidePosition.LEFT)).not.toThrow();
        expect(p.pos.y).toBe(0);
    });
});
