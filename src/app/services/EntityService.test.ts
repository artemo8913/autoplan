import { describe, it, expect } from "vitest";

import { AnchorSection, CatenaryPole, FixingPoint, Railway, VlPole } from "@/entities/catenaryPlanGraphic";

import { EntityService } from "./EntityService";
import { CatenaryPoleStore } from "../store/CatenaryPoleStore";
import { VlPolesStore } from "../store/VlPolesStore";
import { TracksStore } from "../store/TracksStore";
import { UndoStackStore } from "../store/UndoStackStore";
import { CrossSpansStore } from "../store/CrossSpansStore";
import { DisconnectorsStore } from "../store/DisconnectorsStore";
import { FixingPointsStore } from "../store/FixingPointsStore";
import { AnchorSectionsStore } from "../store/AnchorSectionsStore";
import { WireLinesStore } from "../store/WireLinesStore";
import { JunctionsStore } from "../store/JunctionsStore";

function setup() {
    const railway = new Railway({ name: "R", startX: 0, endX: 10000 });
    const catenaryPolesStore = new CatenaryPoleStore([]);
    const vlPolesStore = new VlPolesStore([]);
    const tracksStore = new TracksStore([], railway);
    const undoStackStore = new UndoStackStore();
    const crossSpansStore = new CrossSpansStore([]);
    const disconnectorsStore = new DisconnectorsStore([]);
    const fixingPointsStore = new FixingPointsStore([]);
    const anchorSectionsStore = new AnchorSectionsStore([]);
    const wireLinesStore = new WireLinesStore([]);
    const junctionsStore = new JunctionsStore([]);

    const service = new EntityService(
        {
            catenaryPoleStore: catenaryPolesStore,
            vlPolesStore,
            tracksStore,
            crossSpansStore,
            disconnectorsStore,
            fixingPointsStore,
            anchorSectionsStore,
            wireLinesStore,
            junctionsStore,
        },
        undoStackStore,
    );

    return {
        service,
        catenaryPolesStore,
        vlPolesStore,
        undoStackStore,
        fixingPointsStore,
        anchorSectionsStore,
    };
}

/** Опора + ТФ на ней, ТФ положена и в стор, и в АУ. */
function makePoleWithFp(x: number, name: string) {
    const pole = new CatenaryPole({ x, name, tracks: {} });
    const fp = new FixingPoint({ pole });
    return { pole, fp };
}

describe("EntityService.deleteEntities — каскад удаления опоры", () => {
    it("удаляет осиротевшие ТФ из стора и из АУ, сбрасывает start/endPole", () => {
        const { service, catenaryPolesStore, fixingPointsStore, anchorSectionsStore } = setup();
        const { pole: pole1, fp: fp1 } = makePoleWithFp(100, "1");
        const { pole: pole2, fp: fp2 } = makePoleWithFp(200, "2");
        catenaryPolesStore.add(pole1);
        catenaryPolesStore.add(pole2);
        fixingPointsStore.add(fp1);
        fixingPointsStore.add(fp2);
        const section = new AnchorSection({
            fixingPoints: [fp1, fp2],
            startPole: pole1,
            endPole: pole2,
        });
        anchorSectionsStore.add(section);

        service.deleteEntities([pole1.id]);

        expect(catenaryPolesStore.poles.has(pole1.id)).toBe(false);
        expect(catenaryPolesStore.poles.has(pole2.id)).toBe(true);
        expect(fixingPointsStore.fixingPoints.has(fp1.id)).toBe(false);
        expect(fixingPointsStore.fixingPoints.has(fp2.id)).toBe(true);
        expect(section.fixingPoints).toEqual([fp2]);
        expect(section.startPole).toBeUndefined();
        expect(section.endPole).toBe(pole2);
    });

    it("undo полностью восстанавливает опору, ТФ и состояние АУ", () => {
        const { service, catenaryPolesStore, undoStackStore, fixingPointsStore, anchorSectionsStore } = setup();
        const { pole: pole1, fp: fp1 } = makePoleWithFp(100, "1");
        const { pole: pole2, fp: fp2 } = makePoleWithFp(200, "2");
        catenaryPolesStore.add(pole1);
        catenaryPolesStore.add(pole2);
        fixingPointsStore.add(fp1);
        fixingPointsStore.add(fp2);
        const section = new AnchorSection({
            fixingPoints: [fp1, fp2],
            startPole: pole1,
            endPole: pole2,
        });
        anchorSectionsStore.add(section);

        service.deleteEntities([pole1.id]);
        undoStackStore.undo();

        expect(catenaryPolesStore.poles.get(pole1.id)).toBe(pole1);
        expect(fixingPointsStore.fixingPoints.get(fp1.id)).toBe(fp1);
        expect(section.fixingPoints).toEqual([fp1, fp2]);
        expect(section.startPole).toBe(pole1);
        expect(section.endPole).toBe(pole2);
    });

    it("redo повторно применяет удаление", () => {
        const { service, catenaryPolesStore, undoStackStore, fixingPointsStore } = setup();
        const { pole: pole1, fp: fp1 } = makePoleWithFp(100, "1");
        catenaryPolesStore.add(pole1);
        fixingPointsStore.add(fp1);

        service.deleteEntities([pole1.id]);
        undoStackStore.undo();
        undoStackStore.redo();

        expect(catenaryPolesStore.poles.has(pole1.id)).toBe(false);
        expect(fixingPointsStore.fixingPoints.has(fp1.id)).toBe(false);
    });

    it("удаление не-опоры (ВЛ-опоры) не трогает ТФ", () => {
        const { service, vlPolesStore, fixingPointsStore } = setup();
        const { pole, fp } = makePoleWithFp(100, "1");
        fixingPointsStore.add(fp);
        const vlPole = new VlPole({ x: 50, y: 0, name: "В1", vlType: "intermediate" });
        vlPolesStore.add(vlPole);
        // опора КС в сторе не нужна — проверяем, что ветка cleanup не сработала
        void pole;

        service.deleteEntities([vlPole.id]);

        expect(vlPolesStore.vlPoles.has(vlPole.id)).toBe(false);
        expect(fixingPointsStore.fixingPoints.has(fp.id)).toBe(true);
    });
});

describe("EntityService.getDeletePreview", () => {
    it("считает опоры и связанные ТФ", () => {
        const { service, catenaryPolesStore, fixingPointsStore } = setup();
        const { pole: pole1, fp: fp1 } = makePoleWithFp(100, "1");
        const { pole: pole2, fp: fp2 } = makePoleWithFp(200, "2");
        catenaryPolesStore.add(pole1);
        catenaryPolesStore.add(pole2);
        fixingPointsStore.add(fp1);
        fixingPointsStore.add(fp2);

        expect(service.getDeletePreview([pole1.id])).toMatchObject({ poles: 1, fixingPoints: 1 });
        expect(service.getDeletePreview([pole1.id, pole2.id])).toMatchObject({ poles: 2, fixingPoints: 2 });
    });

    it("для не-опоры возвращает нули", () => {
        const { service, vlPolesStore } = setup();
        const vlPole = new VlPole({ x: 50, y: 0, name: "В1", vlType: "intermediate" });
        vlPolesStore.add(vlPole);

        expect(service.getDeletePreview([vlPole.id])).toMatchObject({ poles: 0, fixingPoints: 0 });
    });
});
