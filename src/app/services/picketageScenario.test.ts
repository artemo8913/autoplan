import { describe, it, expect } from "vitest";

import { CatenaryPole, Railway, Track } from "@/entities/catenaryPlanGraphic";
import { RelativeSidePosition } from "@/shared/types/catenaryTypes";
import type { Picketage } from "@/shared/types/catenaryTypes";
import { formatOrdinateCompact, kmPkMToMeters, metersToKmPkM } from "@/shared/lib/measure";
import { addNonStandardKm, buildScaleTicks, setPicketCount, setPicketOverride } from "@/shared/lib/picketageOps";

import { TrackService } from "./TrackService";
import { UndoStackStore } from "../store/UndoStackStore";
import { makePlanEntityStores } from "./planStores.test-helper";

// Сквозной сценарий п. 7.2: задали рубленый км — координаты опор, их ординаты в таблице
// и шкала км/пк должны остаться согласованными между собой.
//
// Договорённость модели: рубленый км меняет **разметку**, а не сам путь. Физическая
// координата опоры (`pole.x`) не двигается, меняется её ординатa — так же, как в поле:
// столбики перебиты, рельсы на месте.

const RAILWAY_END = 3000;

function setup() {
    const railway = new Railway({ name: "Участок", startX: 0, endX: RAILWAY_END });
    const stores = makePlanEntityStores(railway);
    const undoStackStore = new UndoStackStore();
    const trackService = new TrackService(stores, undoStackStore);

    const track = new Track({ railway, name: "1", startX: 0, endX: RAILWAY_END, yOffsetMeters: 5 });
    stores.tracksStore.add(track);

    const addPole = (name: string, km: number, pk: number, m: number) => {
        const pole = new CatenaryPole({
            x: kmPkMToMeters(km, pk, m, railway.picketage),
            name,
            trackBindings: [{ track, gabarit: 3.1, relativePositionToTrack: RelativeSidePosition.LEFT }],
        });
        stores.catenaryPoleStore.add(pole);
        return pole;
    };

    return { railway, stores, undoStackStore, trackService, addPole };
}

/**
 * Инвариант «нарисовано = посчитано»: у каждой опоры её ордината должна попадать
 * ровно на тик шкалы своего пикета (X тика + остаток в метрах = X опоры).
 */
function expectPolesAlignedWithScale(railway: Railway, poles: CatenaryPole[]) {
    const { kmTicks, pkTicks } = buildScaleTicks(railway.startX, railway.endX, railway.picketage);
    const tickX = (km: number, pk: number) =>
        pk === 0 ? kmTicks.find((t) => t.km === km)?.x : pkTicks.find((t) => t.km === km && t.pk === pk)?.x;

    for (const pole of poles) {
        const { km, pk, m } = metersToKmPkM(pole.x, railway.picketage);
        const x = tickX(km, pk);
        expect(x, `нет тика для ${km}км${pk}пк (опора №${pole.name})`).toBeDefined();
        expect(x! + m, `опора №${pole.name} разъехалась со шкалой`).toBe(pole.x);
    }
}

describe("сценарий: рубленый км ↔ опоры ↔ шкала", () => {
    it("рубленый км не двигает опоры, но перенумеровывает их ординаты", () => {
        const { railway, trackService, addPole, undoStackStore } = setup();
        const before = addPole("1", 0, 5, 0); // x = 500, левее рубленого км
        const inside = addPole("3", 1, 5, 0); // x = 1500, внутри рубленого км до отклонения
        const after = addPole("5", 2, 0, 0); // x = 2000, правее — именно он и «переедет»

        expect(formatOrdinateCompact(after.x, railway.picketage)).toBe("2км0пк+0");
        expectPolesAlignedWithScale(railway, [before, inside, after]);

        // км1 объявлен рубленым: 11 пикетов, последний — 43 м (итого 1043 м)
        const picketage: Picketage = setPicketOverride(setPicketCount(addNonStandardKm([], 1), 1, 11), 1, 10, 43);
        trackService.setPicketage(picketage, "Добавлен нестандартный км 1");

        // физика на месте
        expect([before.x, inside.x, after.x]).toEqual([500, 1500, 2000]);
        // разметка перебита: то, что было началом км2, стало ПК10 рубленого км1
        expect(formatOrdinateCompact(before.x, railway.picketage)).toBe("0км5пк+0");
        expect(formatOrdinateCompact(inside.x, railway.picketage)).toBe("1км5пк+0");
        expect(formatOrdinateCompact(after.x, railway.picketage)).toBe("1км10пк+0");
        expectPolesAlignedWithScale(railway, [before, inside, after]);

        undoStackStore.undo();

        expect(railway.picketage).toEqual([]);
        expect(formatOrdinateCompact(after.x, railway.picketage)).toBe("2км0пк+0");
        expectPolesAlignedWithScale(railway, [before, inside, after]);
    });

    it("ввод ординаты в панели после рубленого км попадает на новую границу", () => {
        const { railway, trackService, addPole } = setup();
        const pole = addPole("1", 2, 0, 0);

        trackService.setPicketage(
            setPicketOverride(setPicketCount(addNonStandardKm([], 1), 1, 11), 1, 10, 43),
            "Добавлен нестандартный км 1",
        );

        // панель опоры: пользователь снова набирает «км 2 пк 0 м 0» — теперь это 2043 м
        const x = kmPkMToMeters(2, 0, 0, railway.picketage);
        expect(x).toBe(2043);
        pole.setX(x);

        expect(formatOrdinateCompact(pole.x, railway.picketage)).toBe("2км0пк+0");
        expectPolesAlignedWithScale(railway, [pole]);

        // и на шкале км2 стоит там же
        const { kmTicks } = buildScaleTicks(railway.startX, railway.endX, railway.picketage);
        expect(kmTicks.find((t) => t.km === 2)?.x).toBe(2043);
    });

    it("укорочённый км подтягивает шкалу и ординаты влево", () => {
        const { railway, trackService, addPole } = setup();
        const pole = addPole("1", 2, 5, 0); // x = 2500

        trackService.setPicketage(setPicketCount(addNonStandardKm([], 1), 1, 9), "Добавлен нестандартный км 1");

        expect(pole.x).toBe(2500);
        expect(formatOrdinateCompact(pole.x, railway.picketage)).toBe("2км6пк+0");
        expectPolesAlignedWithScale(railway, [pole]);

        const { kmTicks } = buildScaleTicks(railway.startX, railway.endX, railway.picketage);
        expect(kmTicks.find((t) => t.km === 2)?.x).toBe(1900);
        expect(kmTicks.find((t) => t.km === 1)).toMatchObject({ isNonStandard: true, lengthM: 900 });
    });
});
