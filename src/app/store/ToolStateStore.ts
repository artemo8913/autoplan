import { makeAutoObservable } from "mobx";

import type { PlaceableEntityConfig, SnapInfo } from "@/shared/types/toolTypes";
import type { Pos } from "@/shared/types/catenaryTypes";

interface PanToolState {
    tool: "panTool";
}

interface IdleState {
    tool: "idle";
}

interface DragPanState {
    tool: "dragPan";
    previousState: Exclude<ToolState, DragPanState>;
    startScreenPos: Pos;
}

interface PlacementState {
    tool: "placement";
    entityConfig: PlaceableEntityConfig;
    previewPos: Pos | null;
    snapInfo: SnapInfo | null;
    isMultiple: boolean;
}

interface MultiSelectState {
    tool: "multiSelect";
    startPos: Pos;
    currentPos: Pos;
}

interface CrossSpanState {
    tool: "crossSpan";
    spanType: "flexible" | "rigid";
    poleAId: string | null;
    previewPoleBId: string | null;
}

interface DragEntitiesState {
    tool: "dragEntities";
    startSvgPos: Pos;
    anchorEntityId: string;
    originalPositions: Map<string, { x: number; y?: number }>;
    axisLock: "none" | "x" | "y";
}

export type ToolState =
    | PanToolState
    | IdleState
    | DragPanState
    | PlacementState
    | MultiSelectState
    | CrossSpanState
    | DragEntitiesState;

export class ToolStateStore {
    toolState: ToolState = { tool: "idle" };

    constructor() {
        makeAutoObservable(this);
    }

    // ── Tool transitions ────────────────────────────────────────────────────

    resetToIdle(): void {
        this.toolState = { tool: "idle" };
    }

    resetToPan(): void {
        this.toolState = { tool: "panTool" };
    }

    // ── Pan state ────────────────────────────────────────────────────────────

    startPan(screenPos: Pos): void {
        const prev = this.toolState.tool === "dragPan" ? this.toolState.previousState : this.toolState;
        this.toolState = {
            tool: "dragPan",
            previousState: prev as Exclude<ToolState, DragPanState>,
            startScreenPos: screenPos,
        };
    }

    endPan(): void {
        if (this.toolState.tool !== "dragPan") {
            return;
        }
        this.toolState = this.toolState.previousState;
    }

    // ── Placement ────────────────────────────────────────────────────────────

    startPlacement(config: PlaceableEntityConfig): void {
        this.toolState = {
            tool: "placement",
            entityConfig: config,
            previewPos: null,
            snapInfo: null,
            isMultiple: false,
        };
    }

    updatePlacementPreview(pos: Pos, snapInfo: SnapInfo | null): void {
        if (this.toolState.tool !== "placement") {
            return;
        }
        this.toolState.previewPos = snapInfo?.snappedPos ?? pos;
        this.toolState.snapInfo = snapInfo;
    }

    setPlacementRepeating(repeating: boolean): void {
        if (this.toolState.tool !== "placement") {
            return;
        }
        this.toolState.isMultiple = repeating;
    }

    commitPlacement(): { config: PlaceableEntityConfig; pos: Pos; snap: SnapInfo | null } | null {
        if (this.toolState.tool !== "placement") {
            return null;
        }
        if (!this.toolState.previewPos) {
            return null;
        }

        const result = {
            config: { ...this.toolState.entityConfig },
            pos: { ...this.toolState.previewPos },
            snap: this.toolState.snapInfo ? { ...this.toolState.snapInfo } : null,
        };

        if (this.toolState.isMultiple) {
            this.toolState.previewPos = null;
            this.toolState.snapInfo = null;
        } else {
            this.resetToIdle();
        }

        return result;
    }

    // ── MultiSelect ──────────────────────────────────────────────────────────

    startMultiSelect(startPos: Pos): void {
        this.toolState = {
            tool: "multiSelect",
            startPos,
            currentPos: startPos,
        };
    }

    updateMultiSelect(currentPos: Pos): void {
        if (this.toolState.tool !== "multiSelect") {
            return;
        }
        this.toolState.currentPos = currentPos;
    }

    endMultiSelect(): void {
        this.toolState = { tool: "idle" };
    }

    // ── CrossSpan ─────────────────────────────────────────────────────────────

    startCrossSpan(spanType: "flexible" | "rigid"): void {
        this.toolState = {
            tool: "crossSpan",
            spanType,
            poleAId: null,
            previewPoleBId: null,
        };
    }

    setCrossSpanPoleA(poleId: string): void {
        if (this.toolState.tool !== "crossSpan") {
            return;
        }
        this.toolState.poleAId = poleId;
    }

    setCrossSpanPreviewPoleB(poleId: string | null): void {
        if (this.toolState.tool !== "crossSpan") {
            return;
        }
        this.toolState.previewPoleBId = poleId;
    }

    commitCrossSpan(): { spanType: "flexible" | "rigid"; poleAId: string; poleBId: string } | null {
        if (this.toolState.tool !== "crossSpan") {
            return null;
        }
        const { spanType, poleAId, previewPoleBId } = this.toolState;
        if (!poleAId || !previewPoleBId || poleAId === previewPoleBId) {
            return null;
        }

        const result = { spanType, poleAId, poleBId: previewPoleBId };
        this.toolState = { tool: "idle" };
        return result;
    }

    // ── Drag Entities ─────────────────────────────────────────────────────────

    startDragEntities(
        startSvgPos: Pos,
        anchorEntityId: string,
        originalPositions: Map<string, { x: number; y?: number }>,
    ): void {
        this.toolState = {
            tool: "dragEntities",
            startSvgPos,
            anchorEntityId,
            originalPositions,
            axisLock: "none",
        };
    }

    setDragAxisLock(axis: "none" | "x" | "y"): void {
        if (this.toolState.tool !== "dragEntities") {
            return;
        }
        this.toolState.axisLock = axis;
    }
}
