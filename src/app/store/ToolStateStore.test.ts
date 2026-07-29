import { describe, it, expect } from "vitest";

import { ToolStateStore } from "./ToolStateStore";
import type { PlaceableEntityConfig, SnapInfo } from "@/shared/types/toolTypes";

const POLE_CONFIG = { kind: "catenaryPole" } as unknown as PlaceableEntityConfig;
const SNAP: SnapInfo = {
    snappedPos: { x: 50, y: 5 },
    snappedTo: "track",
    magnetDistance: 5,
    nearbyTracks: [],
} as unknown as SnapInfo;

describe("ToolStateStore — базовые переходы", () => {
    it("стартует в idle", () => {
        expect(new ToolStateStore().toolState).toEqual({ tool: "idle" });
    });

    it("resetToPan / resetToIdle", () => {
        const s = new ToolStateStore();
        s.resetToPan();
        expect(s.toolState.tool).toBe("panTool");
        s.resetToIdle();
        expect(s.toolState.tool).toBe("idle");
    });
});

describe("ToolStateStore — pan (drag)", () => {
    it("startPan сохраняет предыдущее состояние, endPan его восстанавливает", () => {
        const s = new ToolStateStore();
        s.resetToPan();
        s.startPan({ x: 10, y: 20 });

        const st = s.toolState;
        if (st.tool !== "dragPan") {
            throw new Error("ожидался dragPan");
        }
        expect(st.startScreenPos).toEqual({ x: 10, y: 20 });
        expect(st.previousState).toEqual({ tool: "panTool" });

        s.endPan();
        expect(s.toolState).toEqual({ tool: "panTool" });
    });

    it("повторный startPan не теряет исходное previousState", () => {
        const s = new ToolStateStore();
        s.startPan({ x: 0, y: 0 }); // из idle
        s.startPan({ x: 5, y: 5 }); // уже dragPan

        const st = s.toolState;
        if (st.tool !== "dragPan") {
            throw new Error("ожидался dragPan");
        }
        expect(st.previousState).toEqual({ tool: "idle" });
        expect(st.startScreenPos).toEqual({ x: 5, y: 5 });
    });

    it("endPan вне dragPan — no-op", () => {
        const s = new ToolStateStore();
        s.endPan();
        expect(s.toolState).toEqual({ tool: "idle" });
    });
});

describe("ToolStateStore — placement", () => {
    it("startPlacement → updatePreview предпочитает snappedPos", () => {
        const s = new ToolStateStore();
        s.startPlacement(POLE_CONFIG);
        s.updatePlacementPreview({ x: 100, y: 0 }, SNAP);

        const st = s.toolState;
        if (st.tool !== "placement") {
            throw new Error("ожидался placement");
        }
        expect(st.previewPos).toEqual(SNAP.snappedPos);
        expect(st.snapInfo).toEqual(SNAP);
    });

    it("updatePreview без snap берёт исходную позицию", () => {
        const s = new ToolStateStore();
        s.startPlacement(POLE_CONFIG);
        s.updatePlacementPreview({ x: 100, y: 0 }, null);

        const st = s.toolState;
        if (st.tool !== "placement") {
            throw new Error("ожидался placement");
        }
        expect(st.previewPos).toEqual({ x: 100, y: 0 });
    });

    it("commitPlacement (одиночное) возвращает данные и сбрасывает в idle", () => {
        const s = new ToolStateStore();
        s.startPlacement(POLE_CONFIG);
        s.updatePlacementPreview({ x: 100, y: 0 }, SNAP);

        const result = s.commitPlacement();
        expect(result).toEqual({ config: POLE_CONFIG, pos: SNAP.snappedPos, snap: SNAP });
        expect(s.toolState).toEqual({ tool: "idle" });
    });

    it("commitPlacement (многократное) остаётся в placement и чистит превью", () => {
        const s = new ToolStateStore();
        s.startPlacement(POLE_CONFIG);
        s.setPlacementRepeating(true);
        s.updatePlacementPreview({ x: 100, y: 0 }, SNAP);

        expect(s.commitPlacement()).not.toBeNull();

        const st = s.toolState;
        if (st.tool !== "placement") {
            throw new Error("ожидался placement");
        }
        expect(st.previewPos).toBeNull();
        expect(st.snapInfo).toBeNull();
    });

    it("commitPlacement без превью или вне placement → null", () => {
        const s = new ToolStateStore();
        expect(s.commitPlacement()).toBeNull(); // вне placement
        s.startPlacement(POLE_CONFIG);
        expect(s.commitPlacement()).toBeNull(); // previewPos == null
    });
});

describe("ToolStateStore — multiSelect", () => {
    it("start/update/end", () => {
        const s = new ToolStateStore();
        s.startMultiSelect({ x: 0, y: 0 });
        s.updateMultiSelect({ x: 30, y: 40 });

        const st = s.toolState;
        if (st.tool !== "multiSelect") {
            throw new Error("ожидался multiSelect");
        }
        expect(st.startPos).toEqual({ x: 0, y: 0 });
        expect(st.currentPos).toEqual({ x: 30, y: 40 });

        s.endMultiSelect();
        expect(s.toolState).toEqual({ tool: "idle" });
    });
});

describe("ToolStateStore — crossSpan", () => {
    it("полный цикл: start → poleA → previewB → commit", () => {
        const s = new ToolStateStore();
        s.startCrossSpan("rigid");
        s.setCrossSpanPoleA("A");
        s.setCrossSpanPreviewPoleB("B");

        expect(s.commitCrossSpan()).toEqual({ spanType: "rigid", poleAId: "A", poleBId: "B" });
        expect(s.toolState).toEqual({ tool: "idle" });
    });

    it("commit отклоняется при совпадении A и B или неполных данных", () => {
        const s = new ToolStateStore();
        s.startCrossSpan("flexible");
        expect(s.commitCrossSpan()).toBeNull(); // нет A/B

        s.setCrossSpanPoleA("X");
        s.setCrossSpanPreviewPoleB("X");
        expect(s.commitCrossSpan()).toBeNull(); // A === B
    });
});

describe("ToolStateStore — dragEntities", () => {
    it("start задаёт axisLock=none, setDragAxisLock меняет ось", () => {
        const s = new ToolStateStore();
        s.startDragEntities({ x: 1, y: 2 }, "anchor", new Map([["anchor", { x: 1, y: 2 }]]));

        let st = s.toolState;
        if (st.tool !== "dragEntities") {
            throw new Error("ожидался dragEntities");
        }
        expect(st.axisLock).toBe("none");

        s.setDragAxisLock("x");
        st = s.toolState;
        if (st.tool !== "dragEntities") {
            throw new Error("ожидался dragEntities");
        }
        expect(st.axisLock).toBe("x");
    });

    it("setDragAxisLock вне dragEntities — no-op", () => {
        const s = new ToolStateStore();
        s.setDragAxisLock("y");
        expect(s.toolState).toEqual({ tool: "idle" });
    });
});
