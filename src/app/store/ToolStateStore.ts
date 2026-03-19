import { makeAutoObservable } from "mobx";

import type { PlaceableEntityConfig, EntityType } from "@/shared/types/toolTypes";
import type { Pos, WireType } from "@/shared/types/catenaryTypes";

import type { SnapInfo } from "../services/SnapService";

// ============================================================================
// Состояния инструментов
// ============================================================================

interface PanToolState {
    tool: "panTool";
}

interface IdleState {
    tool: "idle";
}

/**
 * Selection — один или несколько объектов выделены.
 */
interface SelectionState {
    tool: "selection";
    selectedIds: string[];
    selectedType: EntityType | "mixed";
    isDragging: boolean;
    dragStartPos?: Pos;
    dragOriginalPositions?: Map<string, Pos>;
}

/**
 * DragPan — перетаскивание холста.
 * Может быть вызван из ЛЮБОГО состояния (Space/MMB).
 * При завершении — возвращаемся в previousState.
 */
interface DragPanState {
    tool: "dragPan";
    previousState: Exclude<ToolState, DragPanState>;
    startScreenPos: Pos;
    // startViewBox убран — хранится в CameraStore.panStartViewBox
}

interface PlacementState {
    tool: "placement";
    entityConfig: PlaceableEntityConfig;
    previewPos: Pos | null;
    snapInfo: SnapInfo | null;
    isRepeating: boolean;
}

interface MultiSelectState {
    tool: "multiSelect";
    startPos: Pos;
    currentPos: Pos;
    candidateIds: string[];
    candidateType: EntityType | "mixed" | null;
}

interface WireDrawingState {
    tool: "wireDrawing";
    wireType: WireType;
    placedPoints: Array<{ poleId: string; structureId?: string; position: Pos }>;
    previewPoint: { poleId: string; position: Pos } | null;
}

interface CrossSpanState {
    tool: "crossSpan";
    spanType: "flexible" | "rigid";
    poleAId: string | null;
    previewPoleBId: string | null;
}

export type ToolState =
    | PanToolState
    | IdleState
    | SelectionState
    | DragPanState
    | PlacementState
    | MultiSelectState
    | WireDrawingState
    | CrossSpanState;

// ============================================================================
// ToolStateStore
// ============================================================================

export class ToolStateStore {
    toolState: ToolState = { tool: "idle" };

    // ── Keyboard modifiers ──────────────────────────────────────────────────
    isSpaceHeld = false;
    isCtrlHeld = false;
    isShiftHeld = false;

    // ── Panels ──────────────────────────────────────────────────────────────
    isInfrastructurePanelOpen = false;

    // ── Hover ───────────────────────────────────────────────────────────────
    hoveredEntity: { id: string; type: EntityType } | null = null;

    constructor() {
        makeAutoObservable(this);
    }

    /** Текущие выделенные ID. Проходит сквозь dragPan. */
    get selectedIds(): string[] {
        let state: ToolState = this.toolState;
        while (state.tool === "dragPan") {
            state = state.previousState;
        }
        if (state.tool === "selection") {
            return (state as SelectionState).selectedIds;
        }
        return [];
    }

    // ── Panel ────────────────────────────────────────────────────────────────

    toggleInfrastructurePanel(): void {
        this.isInfrastructurePanelOpen = !this.isInfrastructurePanelOpen;
    }

    // ── Tool transitions ────────────────────────────────────────────────────

    resetToIdle(): void {
        this.toolState = { tool: "idle" };
    }

    resetToPan(): void {
        this.toolState = { tool: "panTool" };
    }

    selectEntity(id: string, entityType: EntityType): void {
        this.toolState = {
            tool: "selection",
            selectedIds: [id],
            selectedType: entityType,
            isDragging: false,
        };
    }

    toggleEntityInSelection(id: string, entityType: EntityType): void {
        if (this.toolState.tool !== "selection") {
            this.selectEntity(id, entityType);
            return;
        }

        const ids = [...this.toolState.selectedIds];
        const idx = ids.indexOf(id);
        const removing = idx >= 0;

        if (removing) {
            ids.splice(idx, 1);
            if (ids.length === 0) {
                this.toolState = { tool: "idle" };
                return;
            }
        } else {
            ids.push(id);
        }

        const newType = this._calcSelectionType(this.toolState.selectedType, entityType, removing);

        this.toolState = {
            ...this.toolState,
            selectedIds: ids,
            selectedType: newType,
        };
    }

    private _calcSelectionType(
        prevType: EntityType | "mixed",
        toggledType: EntityType,
        removing: boolean,
    ): EntityType | "mixed" {
        if (!removing) {
            // Добавляем: смешиваем, если типы разные
            return prevType === toggledType || prevType === "mixed" ? prevType : "mixed";
        }
        // Убираем: если тип был mixed или тип равен убираемому — оставляем как есть
        // (точное пересчёт требует итерации по оставшимся — упрощаем: сохраняем prevType)
        return prevType;
    }

    startDragSelection(startPos: Pos, originalPositions: Map<string, Pos>): void {
        if (this.toolState.tool !== "selection") {
            return;
        }
        this.toolState = {
            ...this.toolState,
            isDragging: true,
            dragStartPos: startPos,
            dragOriginalPositions: originalPositions,
        };
    }

    endDragSelection(): void {
        if (this.toolState.tool !== "selection") {
            return;
        }
        this.toolState = {
            ...this.toolState,
            isDragging: false,
            dragStartPos: undefined,
            dragOriginalPositions: undefined,
        };
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
            isRepeating: false,
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
        this.toolState.isRepeating = repeating;
    }

    cyclePlacementSubtype(): void {
        if (this.toolState.tool !== "placement") {
            return;
        }
        this.toolState.entityConfig = ToolStateStore._cycleConfig(this.toolState.entityConfig);
    }

    private static _cycleConfig(cfg: PlaceableEntityConfig): PlaceableEntityConfig {
        if (cfg.kind === "catenaryPole") {
            const cycle: Array<"concrete" | "metal"> = ["concrete", "metal"];
            const idx = cycle.indexOf(cfg.material ?? "concrete");
            return { ...cfg, material: cycle[(idx + 1) % cycle.length] };
        }
        if (cfg.kind === "vlPole") {
            const cycle: Array<"intermediate" | "angular" | "terminal"> = ["intermediate", "angular", "terminal"];
            const idx = cycle.indexOf(cfg.vlType);
            return { ...cfg, vlType: cycle[(idx + 1) % cycle.length] };
        }
        return cfg;
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

        if (this.toolState.isRepeating) {
            this.toolState.previewPos = null;
            this.toolState.snapInfo = null;
        } else {
            this.toolState = { tool: "idle" };
        }

        return result;
    }

    // ── MultiSelect ──────────────────────────────────────────────────────────

    startMultiSelect(startPos: Pos): void {
        this.toolState = {
            tool: "multiSelect",
            startPos,
            currentPos: startPos,
            candidateIds: [],
            candidateType: null,
        };
    }

    updateMultiSelect(currentPos: Pos, candidateIds: string[], candidateType: EntityType | "mixed" | null): void {
        if (this.toolState.tool !== "multiSelect") {
            return;
        }
        this.toolState.currentPos = currentPos;
        this.toolState.candidateIds = candidateIds;
        this.toolState.candidateType = candidateType;
    }

    commitMultiSelect(): void {
        if (this.toolState.tool !== "multiSelect") {
            return;
        }

        const { candidateIds, candidateType } = this.toolState;

        if (candidateIds.length === 0) {
            this.toolState = { tool: "idle" };
            return;
        }

        this.toolState = {
            tool: "selection",
            selectedIds: [...candidateIds],
            selectedType: candidateType ?? "mixed",
            isDragging: false,
        };
    }

    // ── Hover ────────────────────────────────────────────────────────────────

    setHover(entity: { id: string; type: EntityType } | null): void {
        this.hoveredEntity = entity;
    }

    // ── Keyboard modifiers ───────────────────────────────────────────────────

    setSpaceHeld(held: boolean): void {
        this.isSpaceHeld = held;
    }

    setCtrlHeld(held: boolean): void {
        this.isCtrlHeld = held;
        if (this.toolState.tool === "placement") {
            this.toolState.isRepeating = held;
        }
    }

    setShiftHeld(held: boolean): void {
        this.isShiftHeld = held;
    }
}
