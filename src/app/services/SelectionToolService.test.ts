import { describe, it, expect } from "vitest";

import { CatenaryPole, CrossSpan, FixingPoint } from "@/entities/catenaryPlanGraphic";
import type { ViewBox } from "@/shared/types/toolTypes";

import { SelectionToolService } from "./SelectionToolService";
import { HitTestService } from "./HitTestService";
import { CatenaryPoleStore } from "../store/CatenaryPoleStore";
import { VlPolesStore } from "../store/VlPolesStore";
import { FixingPointsStore } from "../store/FixingPointsStore";
import { WireLinesStore } from "../store/WireLinesStore";
import { AnchorSectionsStore } from "../store/AnchorSectionsStore";
import { JunctionsStore } from "../store/JunctionsStore";
import { CrossSpansStore } from "../store/CrossSpansStore";
import { DisconnectorsStore } from "../store/DisconnectorsStore";
import { DisplaySettingsStore } from "../store/DisplaySettingsStore";
import { SelectionStore } from "../store/SelectionStore";
import { ToolStateStore } from "../store/ToolStateStore";
import { UIPanelsStore } from "../store/UIPanelsStore";

const VIEWBOX: ViewBox = { x: 0, y: 0, width: 100, height: 100 };
const CLIENT_W = 100; // svgPerPx = 1

function setup(poles: CatenaryPole[] = [], fps: FixingPoint[] = [], crossSpans: CrossSpan[] = []) {
    const catenaryPoleStore = new CatenaryPoleStore(poles);
    const selectionStore = new SelectionStore();
    const uiPanelsStore = new UIPanelsStore();
    const hitTestService = new HitTestService(
        catenaryPoleStore,
        new VlPolesStore([]),
        new FixingPointsStore(fps),
        new WireLinesStore([]),
        new AnchorSectionsStore([]),
        new JunctionsStore([]),
        new CrossSpansStore(crossSpans),
        new DisconnectorsStore([]),
        new DisplaySettingsStore(),
    );
    const service = new SelectionToolService(new ToolStateStore(), selectionStore, hitTestService, uiPanelsStore);

    return { service, selectionStore, uiPanelsStore };
}

const pole = (x: number, name = String(x)) => new CatenaryPole({ x, name, trackBindings: [] }); // pos {x, 0}

/** ПКМ в точке: экранные координаты в этом масштабе совпадают с svg. */
function rightClickAt(service: SelectionToolService, x: number, y = 0) {
    service.syncSelectionForContextMenu({ x, y }, { x, y }, VIEWBOX, CLIENT_W);
}

describe("SelectionToolService.syncSelectionForContextMenu", () => {
    it("ПКМ по невыделенному объекту выделяет его", () => {
        const cp = pole(0);
        const { service, selectionStore } = setup([cp]);

        rightClickAt(service, 0);

        expect(selectionStore.selectedIds).toEqual([cp.id]);
        expect(selectionStore.selectedType).toBe("catenaryPole");
    });

    it("ПКМ по объекту внутри выделения выделение не сбрасывает", () => {
        const cp1 = pole(0);
        const cp2 = pole(1000);
        const { service, selectionStore } = setup([cp1, cp2]);
        selectionStore.setMulti([cp1.id, cp2.id], "catenaryPole");

        rightClickAt(service, 0);

        expect(selectionStore.selectedIds).toEqual([cp1.id, cp2.id]);
    });

    it("ПКМ по другому объекту перевыделяет на него", () => {
        const cp1 = pole(0);
        const cp2 = pole(1000);
        const { service, selectionStore } = setup([cp1, cp2]);
        selectionStore.select(cp1.id, "catenaryPole");

        rightClickAt(service, 1000);

        expect(selectionStore.selectedIds).toEqual([cp2.id]);
    });

    it("ПКМ по пустому месту оставляет выделение как есть — меню строится по нему", () => {
        const cp = pole(0);
        const { service, selectionStore } = setup([cp]);
        selectionStore.select(cp.id, "catenaryPole");

        rightClickAt(service, 5000);

        expect(selectionStore.selectedIds).toEqual([cp.id]);
    });

    it("ПКМ по точке фиксации выделяет саму ТФ — как обычный клик", () => {
        const cp = pole(0);
        const fp = new FixingPoint({ pole: cp, yOffset: 40 });
        const { service, selectionStore } = setup([cp], [fp]);

        rightClickAt(service, 0, 20); // по консоли, за пределами символа опоры

        expect(selectionStore.selectedIds).toEqual([fp.id]);
        expect(selectionStore.selectedType).toBe("fixingPoint");
    });
});

/** Клик мышью: нажали и отпустили в одной точке. */
function clickAt(service: SelectionToolService, x: number, y = 0, shiftKey = false) {
    service.beginGesture({ x, y }, { x, y }, VIEWBOX, CLIENT_W);
    service.endGesture({ x, y }, shiftKey);
}

describe("SelectionToolService: ТФ как самостоятельная сущность", () => {
    it("клик по консоли выделяет ТФ, а не её опору", () => {
        const cp = pole(0);
        const fp = new FixingPoint({ pole: cp, yOffset: 40 });
        const { service, selectionStore } = setup([cp], [fp]);

        clickAt(service, 0, 20);

        expect(selectionStore.selectedIds).toEqual([fp.id]);
        expect(selectionStore.selectedType).toBe("fixingPoint");
    });

    it("клик по символу опоры выделяет опору, даже если на ней висит ТФ", () => {
        const cp = pole(0);
        const fp = new FixingPoint({ pole: cp, yOffset: 40 });
        const { service, selectionStore } = setup([cp], [fp]);

        clickAt(service, 0, 0);

        expect(selectionStore.selectedIds).toEqual([cp.id]);
    });

    it("Shift+клик копит ТФ — путь к массовым операциям над ними", () => {
        const cp1 = pole(0);
        const cp2 = pole(1000);
        const fp1 = new FixingPoint({ pole: cp1, yOffset: 40 });
        const fp2 = new FixingPoint({ pole: cp2, yOffset: 40 });
        const { service, selectionStore } = setup([cp1, cp2], [fp1, fp2]);

        clickAt(service, 0, 20);
        clickAt(service, 1000, 20, true);

        expect(selectionStore.selectedIds).toEqual([fp1.id, fp2.id]);
        expect(selectionStore.selectedType).toBe("fixingPoint");
    });
});

describe("SelectionToolService: панель по типу выделенного", () => {
    it("клик по поперечине выделяет её и открывает панель характеристик", () => {
        const cp1 = pole(0);
        const cp2 = pole(1000);
        const cs = new CrossSpan({ spanType: "rigid", poleA: cp1, poleB: cp2 });
        const { service, selectionStore, uiPanelsStore } = setup([cp1, cp2], [], [cs]);

        clickAt(service, 500);

        expect(selectionStore.selectedIds).toEqual([cs.id]);
        expect(selectionStore.selectedType).toBe("crossSpan");
        expect(uiPanelsStore.isOpenCrossSpanEditorPanel).toBe(true);
        expect(uiPanelsStore.isOpenPoleEditorPanel).toBe(false);
    });

    it("клик по опоре панель поперечин не открывает", () => {
        const cp1 = pole(0);
        const cp2 = pole(1000);
        const cs = new CrossSpan({ spanType: "rigid", poleA: cp1, poleB: cp2 });
        const { service, uiPanelsStore } = setup([cp1, cp2], [], [cs]);

        clickAt(service, 0);

        expect(uiPanelsStore.isOpenPoleEditorPanel).toBe(true);
        expect(uiPanelsStore.isOpenCrossSpanEditorPanel).toBe(false);
    });
});
