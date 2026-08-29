import { describe, it, expect } from "vitest";

import { CatenaryPole, FixingPoint } from "@/entities/catenaryPlanGraphic";

import { DragService } from "./DragService";
import { CatenaryPoleStore } from "../store/CatenaryPoleStore";
import { VlPolesStore } from "../store/VlPolesStore";
import { UndoStackStore } from "../store/UndoStackStore";
import { ToolStateStore } from "../store/ToolStateStore";

function setup(poles: CatenaryPole[] = []) {
    const catenaryPoleStore = new CatenaryPoleStore(poles);
    const undoStackStore = new UndoStackStore();
    const toolStateStore = new ToolStateStore();
    const service = new DragService(catenaryPoleStore, new VlPolesStore([]), undoStackStore, toolStateStore);

    return { service, undoStackStore, toolStateStore };
}

const pole = (x: number) => new CatenaryPole({ x, name: String(x), trackBindings: [] });

describe("DragService.beginDrag", () => {
    it("перетаскивает опору", () => {
        const cp = pole(100);
        const { service, toolStateStore, undoStackStore } = setup([cp]);

        service.beginDrag([cp.id], { x: 100, y: 0 }, cp.id);
        expect(toolStateStore.toolState.tool).toBe("dragEntities");

        service.moveDrag({ x: 150, y: 0 }, false);
        service.endDrag();

        expect(cp.x).toBe(150);
        expect(undoStackStore.canUndo).toBe(true);
    });

    it("выделенная ТФ не тянется: своей позиции у неё нет, и пустой записи в undo не появляется", () => {
        const cp = pole(100);
        const fp = new FixingPoint({ pole: cp, yOffset: 40 });
        const { service, toolStateStore, undoStackStore } = setup([cp]);

        service.beginDrag([fp.id], { x: 100, y: 40 }, fp.id);

        expect(toolStateStore.toolState.tool).toBe("idle");

        service.moveDrag({ x: 150, y: 40 }, false);
        service.endDrag();

        expect(cp.x).toBe(100);
        expect(undoStackStore.canUndo).toBe(false);
    });

    it("в смешанном выделении тянутся опоры, ТФ едут за своей опорой", () => {
        const cp = pole(100);
        const fp = new FixingPoint({ pole: cp, yOffset: 40 });
        const { service, toolStateStore } = setup([cp]);

        service.beginDrag([cp.id, fp.id], { x: 100, y: 0 }, cp.id);
        expect(toolStateStore.toolState.tool).toBe("dragEntities");

        service.moveDrag({ x: 150, y: 0 }, false);
        service.endDrag();

        expect(cp.x).toBe(150);
        expect(fp.startPos.x).toBe(150);
    });
});
