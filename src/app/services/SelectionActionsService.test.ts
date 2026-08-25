import { describe, it, expect } from "vitest";

import { CatenaryPole, FixingPoint, Railway } from "@/entities/catenaryPlanGraphic";

import { SelectionActionsService } from "./SelectionActionsService";
import { EntityService } from "./EntityService";
import { MemoryNotificationService } from "./NotificationService";
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
import { SelectionStore } from "../store/SelectionStore";
import { ConfirmDialogStore } from "../store/ConfirmDialogStore";

function setup() {
    const catenaryPoleStore = new CatenaryPoleStore([]);
    const fixingPointsStore = new FixingPointsStore([]);
    const undoStackStore = new UndoStackStore();

    const entityService = new EntityService(
        {
            catenaryPoleStore,
            vlPolesStore: new VlPolesStore([]),
            tracksStore: new TracksStore([], new Railway({ name: "R", startX: 0, endX: 10000 })),
            crossSpansStore: new CrossSpansStore([]),
            disconnectorsStore: new DisconnectorsStore([]),
            fixingPointsStore,
            anchorSectionsStore: new AnchorSectionsStore([]),
            wireLinesStore: new WireLinesStore([]),
            junctionsStore: new JunctionsStore([]),
        },
        undoStackStore,
        new MemoryNotificationService(),
    );

    const selectionStore = new SelectionStore();
    const confirmDialogStore = new ConfirmDialogStore();
    const service = new SelectionActionsService(selectionStore, entityService, confirmDialogStore);

    return { service, selectionStore, confirmDialogStore, catenaryPoleStore, fixingPointsStore, undoStackStore };
}

/** Опора с точкой фиксации: удаление опоры уводит за собой ТФ — есть что показать в подтверждении. */
function addPoleWithFp(
    catenaryPoleStore: CatenaryPoleStore,
    fixingPointsStore: FixingPointsStore,
    x: number,
    name: string,
) {
    const pole = new CatenaryPole({ x, name, trackBindings: [] });
    const fp = new FixingPoint({ pole });
    catenaryPoleStore.add(pole);
    fixingPointsStore.add(fp);
    return { pole, fp };
}

describe("SelectionActionsService.deleteSelection", () => {
    it("спрашивает подтверждение и перечисляет каскад", async () => {
        const { service, selectionStore, confirmDialogStore, catenaryPoleStore, fixingPointsStore } = setup();
        const { pole } = addPoleWithFp(catenaryPoleStore, fixingPointsStore, 100, "1");
        selectionStore.select(pole.id, "catenaryPole");

        const done = service.deleteSelection();
        expect(confirmDialogStore.request?.details).toEqual(["опора КС: 1", "точка фиксации: 1"]);
        expect(confirmDialogStore.request?.danger).toBe(true);

        confirmDialogStore.confirm();
        await done;
    });

    it("после подтверждения удаляет выделенное вместе с каскадом и снимает выделение", async () => {
        const { service, selectionStore, confirmDialogStore, catenaryPoleStore, fixingPointsStore } = setup();
        const { pole, fp } = addPoleWithFp(catenaryPoleStore, fixingPointsStore, 100, "1");
        selectionStore.select(pole.id, "catenaryPole");

        const done = service.deleteSelection();
        confirmDialogStore.confirm();
        await done;

        expect(catenaryPoleStore.poles.has(pole.id)).toBe(false);
        expect(fixingPointsStore.fixingPoints.has(fp.id)).toBe(false);
        expect(selectionStore.hasSelection).toBe(false);
    });

    it("отказ в диалоге ничего не удаляет и оставляет выделение", async () => {
        const { service, selectionStore, confirmDialogStore, catenaryPoleStore, fixingPointsStore, undoStackStore } =
            setup();
        const { pole } = addPoleWithFp(catenaryPoleStore, fixingPointsStore, 100, "1");
        selectionStore.select(pole.id, "catenaryPole");

        const done = service.deleteSelection();
        confirmDialogStore.cancel();
        await done;

        expect(catenaryPoleStore.poles.has(pole.id)).toBe(true);
        expect(selectionStore.selectedIds).toEqual([pole.id]);
        expect(undoStackStore.canUndo).toBe(false);
    });

    it("на пустом выделении не спрашивает ничего", async () => {
        const { service, confirmDialogStore } = setup();

        await service.deleteSelection();

        expect(confirmDialogStore.request).toBeNull();
    });

    it("удаляет всё выделение целиком, а не только первый объект", async () => {
        const { service, selectionStore, confirmDialogStore, catenaryPoleStore, fixingPointsStore } = setup();
        const { pole: pole1 } = addPoleWithFp(catenaryPoleStore, fixingPointsStore, 100, "1");
        const { pole: pole2 } = addPoleWithFp(catenaryPoleStore, fixingPointsStore, 200, "2");
        selectionStore.setMulti([pole1.id, pole2.id], "catenaryPole");

        const done = service.deleteSelection();
        expect(confirmDialogStore.request?.details).toEqual(["опоры КС: 2", "точки фиксации: 2"]);
        confirmDialogStore.confirm();
        await done;

        expect(catenaryPoleStore.poles.size).toBe(0);
    });

    it("удаление ложится в undo-стек одной командой", async () => {
        const { service, selectionStore, confirmDialogStore, catenaryPoleStore, fixingPointsStore, undoStackStore } =
            setup();
        const { pole, fp } = addPoleWithFp(catenaryPoleStore, fixingPointsStore, 100, "1");
        selectionStore.select(pole.id, "catenaryPole");

        const done = service.deleteSelection();
        confirmDialogStore.confirm();
        await done;

        undoStackStore.undo();

        expect(catenaryPoleStore.poles.has(pole.id)).toBe(true);
        expect(fixingPointsStore.fixingPoints.has(fp.id)).toBe(true);
        expect(undoStackStore.canUndo).toBe(false);
    });
});
