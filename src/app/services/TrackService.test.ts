import { describe, it, expect } from "vitest";

import { RelativeSidePosition } from "@/shared/types/catenaryTypes";
import { AnchorSection, CatenaryPole, FixingPoint, Railway, Track } from "@/entities/catenaryPlanGraphic";

import { TrackService } from "./TrackService";
import { UndoStackStore } from "../store/UndoStackStore";
import { makePlanEntityStores } from "./planStores.test-helper";

function setup() {
    const railway = new Railway({ name: "Участок", startX: 0, endX: 10000 });
    const stores = makePlanEntityStores(railway);
    const undoStackStore = new UndoStackStore();
    const service = new TrackService(stores, undoStackStore);
    return { service, stores, undoStackStore, railway };
}

describe("TrackService — пути", () => {
    it("createTrack кладёт путь в стор со следующим смещением; undo убирает", () => {
        const { service, stores, undoStackStore } = setup();

        const first = service.createTrack();
        const second = service.createTrack();

        expect(stores.tracksStore.list).toEqual([first, second]);
        expect(first.yOffsetMeters).toBe(5);
        expect(second.yOffsetMeters).toBe(10);

        undoStackStore.undo();
        expect(stores.tracksStore.list).toEqual([first]);
    });

    it("deleteTrack снимает привязки опор и ТФ; undo возвращает их", () => {
        const { service, stores, undoStackStore, railway } = setup();
        const track = new Track({ railway, name: "1", startX: 0, endX: 10000, yOffsetMeters: 5 });
        stores.tracksStore.add(track);
        const pole = new CatenaryPole({
            x: 100,
            name: "1",
            tracks: { [track.id]: { track, gabarit: 3.1, relativePositionToTrack: RelativeSidePosition.LEFT } },
        });
        stores.catenaryPoleStore.add(pole);
        const fp = new FixingPoint({ pole, track });
        stores.fixingPointsStore.add(fp);
        const section = new AnchorSection({ fixingPoints: [fp], primaryTrack: track });
        stores.anchorSectionsStore.add(section);

        service.deleteTrack(track);

        expect(stores.tracksStore.tracks.has(track.id)).toBe(false);
        expect(pole.tracks[track.id]).toBeUndefined();
        expect(fp.track).toBeUndefined();
        expect(section.primaryTrack).toBeUndefined();
        // сама опора и ТФ остаются — путь их не уносит
        expect(stores.catenaryPoleStore.poles.has(pole.id)).toBe(true);
        expect(stores.fixingPointsStore.fixingPoints.has(fp.id)).toBe(true);

        undoStackStore.undo();

        expect(stores.tracksStore.tracks.get(track.id)).toBe(track);
        expect(pole.tracks[track.id]).toBeDefined();
        expect(fp.track).toBe(track);
        expect(section.primaryTrack).toBe(track);
    });

    it("getDeleteBlockReason считает привязанные опоры и ТФ", () => {
        const { service, stores, railway } = setup();
        const track = new Track({ railway, name: "1", startX: 0, endX: 10000, yOffsetMeters: 5 });
        stores.tracksStore.add(track);

        expect(service.getDeleteBlockReason(track.id)).toBeNull();

        const pole = new CatenaryPole({
            x: 100,
            name: "1",
            tracks: { [track.id]: { track, gabarit: 3.1, relativePositionToTrack: RelativeSidePosition.LEFT } },
        });
        stores.catenaryPoleStore.add(pole);
        expect(service.getDeleteBlockReason(track.id)).toBe("Привязано 1 опор");

        stores.fixingPointsStore.add(new FixingPoint({ pole, track }));
        expect(service.getDeleteBlockReason(track.id)).toBe("Привязано 1 опор и 1 точек фиксации");
    });

    it("правки свойств пути обратимы, серия правок имени склеивается", () => {
        const { service, stores, undoStackStore } = setup();
        const track = service.createTrack();
        const depthBefore = stores.tracksStore.list.length && undoStackStore.undoStack.length;

        service.setTrackName(track, "I");
        service.setTrackName(track, "II");
        service.setTrackYOffset(track, -7);
        service.setTrackStartX(track, 500);
        service.setTrackEndX(track, 9000);

        expect(track.name).toBe("II");
        expect(track.yOffsetMeters).toBe(-7);
        expect(track.directionMultiplier).toBe(-1);
        expect(track.startX).toBe(500);
        expect(track.endX).toBe(9000);
        expect(undoStackStore.undoStack.length).toBe(depthBefore + 4);

        undoStackStore.undo();
        expect(track.endX).toBe(10000);
        undoStackStore.undo();
        expect(track.startX).toBe(0);
        undoStackStore.undo();
        expect(track.yOffsetMeters).toBe(5);
        undoStackStore.undo();
        expect(track.name).toBe("1");
    });
});

describe("TrackService — участок", () => {
    it("название и границы участка правятся обратимо", () => {
        const { service, undoStackStore, railway } = setup();

        service.setRailwayName("Перегон А–Б");
        service.setRailwayStartX(1000);
        service.setRailwayEndX(9000);

        expect(railway.name).toBe("Перегон А–Б");
        expect(railway.startX).toBe(1000);
        expect(railway.endX).toBe(9000);

        undoStackStore.undo();
        expect(railway.endX).toBe(10000);
        undoStackStore.undo();
        expect(railway.startX).toBe(0);
        undoStackStore.undo();
        expect(railway.name).toBe("Участок");
    });

    it("пикетаж заменяется целиком и откатывается", () => {
        const { service, undoStackStore, railway } = setup();
        const picketage = [{ km: 5, picketCount: 9, picketOverrides: {} }];

        service.setPicketage(picketage, "Добавлен нестандартный км 5");

        expect(railway.picketage).toEqual(picketage);

        undoStackStore.undo();
        expect(railway.picketage).toEqual([]);
    });

    it("правки пикетажа с одним mergeKey склеиваются", () => {
        const { service, undoStackStore, railway } = setup();

        service.setPicketage([{ km: 5, picketCount: 8, picketOverrides: {} }], "ПК", "picketCount:5");
        service.setPicketage([{ km: 5, picketCount: 9, picketOverrides: {} }], "ПК", "picketCount:5");

        expect(undoStackStore.undoStack.length).toBe(1);

        undoStackStore.undo();
        expect(railway.picketage).toEqual([]);
    });
});
