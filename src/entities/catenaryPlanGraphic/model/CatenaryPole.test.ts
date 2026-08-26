import { describe, it, expect } from "vitest";

import { RelativeSidePosition } from "@/shared/types/catenaryTypes";

import { CatenaryPole } from "./CatenaryPole";
import { Railway } from "./Railway";
import { Track } from "./Track";

import { bindingGabarit, bindingSide, offsetFromGabarit } from "../lib/trackBinding";

const railway = new Railway({ name: "R", startX: 0, endX: 10000 });
// trackY = yOffsetMeters * 10. Здесь все треки на оси (trackY = 0), кроме явных.
const track = (name: string, yOffsetMeters = 0) =>
    new Track({ railway, name, startX: 0, endX: 10000, yOffsetMeters });

const bind = (t: Track, gabarit: number, direction: RelativeSidePosition) => [
    { track: t, offsetMeters: offsetFromGabarit(gabarit, direction, t.directionMultiplier) },
];

const trackIds = (p: CatenaryPole) => p.trackBindings.map((b) => b.track.id);

describe("CatenaryPole.pos", () => {
    it("без путей y=0", () => {
        const p = new CatenaryPole({ x: 100, name: "1", trackBindings: [] });
        expect(p.pos).toEqual({ x: 100, y: 0 });
    });

    it("y = trackY + scale·gabarit·(сторона·направление)", () => {
        const t = track("1"); // trackY 0, dirMult +1
        const p = new CatenaryPole({ x: 100, name: "1", trackBindings: bind(t, 5, RelativeSidePosition.RIGHT) });
        expect(p.pos.y).toBe(50); // 0 + 10*5*(1*1)
    });

    it("сторона LEFT отражает знак", () => {
        const t = track("1");
        const p = new CatenaryPole({ x: 0, name: "1", trackBindings: bind(t, 5, RelativeSidePosition.LEFT) });
        expect(p.pos.y).toBe(-50);
    });
});

describe("CatenaryPole.primaryGabarit", () => {
    it("габарит главного пути", () => {
        const p = new CatenaryPole({ x: 0, name: "1", trackBindings: bind(track("1"), 7, RelativeSidePosition.RIGHT) });
        expect(p.primaryGabarit).toBe(7);
    });
    it("0 без путей", () => {
        expect(new CatenaryPole({ x: 0, name: "1", trackBindings: [] }).primaryGabarit).toBe(0);
    });
});

describe("CatenaryPole.setTrackGabarit / flipTrackSide", () => {
    it("setTrackGabarit меняет позицию", () => {
        const t = track("1");
        const p = new CatenaryPole({ x: 0, name: "1", trackBindings: bind(t, 5, RelativeSidePosition.RIGHT) });
        p.setTrackGabarit(t.id, 8);
        expect(p.pos.y).toBe(80);
    });

    it("flipTrackSide отражает позицию, сохраняя габарит", () => {
        const t = track("1");
        const p = new CatenaryPole({ x: 0, name: "1", trackBindings: bind(t, 5, RelativeSidePosition.RIGHT) });
        p.flipTrackSide(t.id);
        expect(p.pos.y).toBe(-50);
        expect(p.primaryGabarit).toBe(5);
        expect(bindingSide(p.primaryBinding!)).toBe(RelativeSidePosition.LEFT);
    });

    it("setTrackGabarit не переворачивает сторону, даже если ему дали отрицательное число", () => {
        const t = track("1");
        const p = new CatenaryPole({ x: 0, name: "1", trackBindings: bind(t, 5, RelativeSidePosition.LEFT) });
        p.setTrackGabarit(t.id, 3);
        expect(p.pos.y).toBe(-30);
        expect(bindingSide(p.primaryBinding!)).toBe(RelativeSidePosition.LEFT);
    });

    it("игнорирует неизвестный путь", () => {
        const p = new CatenaryPole({ x: 0, name: "1", trackBindings: [] });
        expect(() => p.setTrackGabarit("nope", 5)).not.toThrow();
        expect(p.pos.y).toBe(0);
    });
});

describe("CatenaryPole.addTrackBinding / removeTrackBinding", () => {
    it("addTrackBinding вычисляет габарит из текущей позиции, не меняя pos (главный путь прежний)", () => {
        const t1 = track("1");
        const p = new CatenaryPole({ x: 0, name: "1", trackBindings: bind(t1, 5, RelativeSidePosition.RIGHT) }); // pos.y 50
        const t2 = track("2"); // trackY 0
        p.addTrackBinding(t2);
        expect(bindingGabarit(p.getBinding(t2.id)!)).toBe(5); // |50 - 0| / 10
        expect(p.pos.y).toBe(50); // считается по главному пути t1
    });

    it("removeTrackBinding удаляет привязку", () => {
        const t1 = track("1");
        const p = new CatenaryPole({ x: 0, name: "1", trackBindings: bind(t1, 5, RelativeSidePosition.RIGHT) });
        p.removeTrackBinding(t1.id);
        expect(p.getBinding(t1.id)).toBeUndefined();
        expect(p.pos.y).toBe(0);
    });
});

describe("CatenaryPole.replaceTrackBinding", () => {
    it("переносит привязку на новый путь, сохраняя габарит/сторону и место в списке, пересчитывая pos", () => {
        const t1 = track("1"); // trackY 0
        const p = new CatenaryPole({ x: 0, name: "1", trackBindings: bind(t1, 5, RelativeSidePosition.RIGHT) });
        const t3 = track("3", 10); // trackY 100
        p.replaceTrackBinding(t1.id, t3);
        expect(p.getBinding(t1.id)).toBeUndefined();
        expect(p.getBinding(t3.id)).toMatchObject({ offsetMeters: 5 });
        expect(p.pos.y).toBe(150); // 100 + 10*5*1
    });

    it("no-op если исходный путь не привязан", () => {
        const t1 = track("1");
        const p = new CatenaryPole({ x: 0, name: "1", trackBindings: bind(t1, 5, RelativeSidePosition.RIGHT) });
        p.replaceTrackBinding("missing", track("9"));
        expect(trackIds(p)).toEqual([t1.id]);
    });

    it("сохраняет прочие привязки и их порядок", () => {
        const t1 = track("1");
        const t2 = track("2");
        const p = new CatenaryPole({
            x: 0,
            name: "1",
            trackBindings: [...bind(t1, 5, RelativeSidePosition.RIGHT), ...bind(t2, 3, RelativeSidePosition.RIGHT)],
        });
        const t3 = track("3", 10);
        p.replaceTrackBinding(t2.id, t3);

        expect(trackIds(p)).toEqual([t1.id, t3.id]); // t1 на месте, t2→t3 в своей позиции
        expect(p.getBinding(t3.id)).toMatchObject({ offsetMeters: 3 });
    });

    it("no-op если целевой путь уже привязан", () => {
        const t1 = track("1");
        const t2 = track("2");
        const p = new CatenaryPole({
            x: 0,
            name: "1",
            trackBindings: [...bind(t1, 5, RelativeSidePosition.RIGHT), ...bind(t2, 3, RelativeSidePosition.RIGHT)],
        });
        p.replaceTrackBinding(t1.id, t2);
        expect(trackIds(p)).toEqual([t1.id, t2.id]);
    });
});

describe("CatenaryPole: главный путь", () => {
    const twoTracks = () => {
        const t1 = track("1"); // trackY 0
        const t2 = track("2", 10); // trackY 100
        const p = new CatenaryPole({
            x: 0,
            name: "1",
            trackBindings: [
                { track: t1, offsetMeters: offsetFromGabarit(5, RelativeSidePosition.RIGHT, t1.directionMultiplier) },
                { track: t2, offsetMeters: offsetFromGabarit(3, RelativeSidePosition.RIGHT, t2.directionMultiplier) },
            ],
        });
        return { t1, t2, p };
    };

    it("по умолчанию главный — первая привязка", () => {
        const { t1, p } = twoTracks();
        expect(p.primaryTrackId).toBe(t1.id);
        expect(p.primaryTrack).toBe(t1);
        expect(p.primaryGabarit).toBe(5);
        expect(p.pos.y).toBe(50); // 0 + 10*5
    });

    it("конструктор принимает явный главный путь — по нему считается pos", () => {
        const t1 = track("1");
        const t2 = track("2", 10);
        const p = new CatenaryPole({
            x: 0,
            name: "1",
            trackBindings: [
                { track: t1, offsetMeters: offsetFromGabarit(5, RelativeSidePosition.RIGHT, t1.directionMultiplier) },
                { track: t2, offsetMeters: offsetFromGabarit(3, RelativeSidePosition.RIGHT, t2.directionMultiplier) },
            ],
            primaryTrackId: t2.id,
        });
        expect(p.primaryTrack).toBe(t2);
        expect(p.pos.y).toBe(130); // 100 + 10*3
    });

    it("setPrimaryTrack переносит расчёт позиции на другой путь", () => {
        const { t2, p } = twoTracks();
        p.setPrimaryTrack(t2.id);
        expect(p.primaryTrack).toBe(t2);
        expect(p.primaryGabarit).toBe(3);
        expect(p.pos.y).toBe(130);
    });

    it("setPrimaryTrack игнорирует непривязанный путь", () => {
        const { t1, p } = twoTracks();
        p.setPrimaryTrack("nope");
        expect(p.primaryTrack).toBe(t1);
    });

    it("удаление главного пути передаёт роль первому оставшемуся", () => {
        const { t1, t2, p } = twoTracks();
        p.setPrimaryTrack(t2.id);
        p.removeTrackBinding(t2.id);
        expect(p.primaryTrack).toBe(t1);
    });

    it("перенос главной привязки сохраняет её главной", () => {
        const { t1, p } = twoTracks();
        const t3 = track("3", 10);
        p.replaceTrackBinding(t1.id, t3);
        expect(p.primaryTrack).toBe(t3);
    });

    it("addTrackBinding назначает главным первый добавленный путь", () => {
        const p = new CatenaryPole({ x: 0, name: "1", trackBindings: [] });
        const t = track("1");
        p.addTrackBinding(t);
        expect(p.primaryTrack).toBe(t);
    });

    it("setTrackBindings восстанавливает и главный путь (используется в undo)", () => {
        const { t1, t2, p } = twoTracks();
        const prev = [...p.trackBindings];
        p.setPrimaryTrack(t2.id);
        p.removeTrackBinding(t1.id);
        p.setTrackBindings(prev, t2.id);
        expect(p.trackBindings).toEqual(prev);
        expect(p.primaryTrack).toBe(t2);
    });
});

describe("CatenaryPole: скалярные сеттеры", () => {
    it("setX / setName / setMaterial / setGrounding / setIsInsulatingJunctionAnchor", () => {
        const p = new CatenaryPole({ x: 0, name: "1", trackBindings: [] });
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
        const p = new CatenaryPole({ x: 0, name: "1", trackBindings: [] });

        p.setAnchorGuy({ type: "single", direction: RelativeSidePosition.RIGHT });
        expect(p.anchorGuy).toEqual({ type: "single", direction: RelativeSidePosition.RIGHT });
        p.setAnchorGuy(undefined);
        expect(p.anchorGuy).toBeUndefined();

        p.setAnchorBrace({ direction: RelativeSidePosition.LEFT });
        expect(p.anchorBrace).toEqual({ direction: RelativeSidePosition.LEFT });
        p.setAnchorBrace(undefined);
        expect(p.anchorBrace).toBeUndefined();
    });

    it("setTrackBindings заменяет весь набор привязок", () => {
        const t = track("1");
        const p = new CatenaryPole({ x: 0, name: "1", trackBindings: [] });
        p.setTrackBindings(bind(t, 5, RelativeSidePosition.RIGHT));
        expect(p.primaryGabarit).toBe(5);
        expect(p.pos.y).toBe(50);
    });

    it("flipTrackSide игнорирует неизвестный путь", () => {
        const p = new CatenaryPole({ x: 0, name: "1", trackBindings: [] });
        expect(() => p.flipTrackSide("nope")).not.toThrow();
        expect(p.pos.y).toBe(0);
    });
});

describe("CatenaryPole — путь сменил сторону участка", () => {
    it("опора остаётся там же относительно пути, а сторона по ходу движения меняется", () => {
        const t = track("1", 5); // чётный: trackY 50, dirMult +1
        const p = new CatenaryPole({ x: 0, name: "1", trackBindings: bind(t, 3.1, RelativeSidePosition.RIGHT) });
        expect(p.pos.y).toBe(81); // 50 + 31, опора ниже пути

        t.setYOffsetMeters(-5); // путь переехал на нечётную сторону: trackY -50, dirMult -1

        // Опора не перепрыгнула через путь: она по-прежнему на 3.1 м ниже него,
        // сменилась только сторона «по ходу движения» — она выводится, а не хранится.
        expect(p.pos.y).toBe(-19); // -50 + 31
        expect(p.primaryGabarit).toBe(3.1);
        expect(bindingSide(p.primaryBinding!)).toBe(RelativeSidePosition.LEFT);
    });
});
