import { makeAutoObservable } from "mobx";
import type { PlaceableEntityConfig, EntityType } from "@/shared/types/toolTypes";
import type { SnapInfo } from "../services/SnapService";

// ── ViewBox ──────────────────────────────────────────────────────────────────
export interface ViewBox {
    x: number;
    y: number;
    width: number;
    height: number;
}
import type { Pos, WireType } from "@/shared/types/catenaryTypes";

// ============================================================================
// Состояния инструментов
// ============================================================================

/**
 * PanTool — режим перемещения холста (по умолчанию).
 * LMB drag = pan. ESC из любого состояния возвращает сюда.
 * Курсор: grab.
 */
interface PanToolState {
    tool: "panTool";
}

/**
 * Idle — инструмент выделения активен, ничего не выбрано.
 * Курсор: default.
 */
interface IdleState {
    tool: "idle";
}

/**
 * Selection — один или несколько объектов выделены.
 * Курсор: default (или grabbing при перетаскивании).
 */
interface SelectionState {
    tool: "selection";

    /** ID выделенных объектов */
    selectedIds: string[];

    /** Тип выделенных объектов (при смешанном выделении — 'mixed') */
    selectedType: EntityType | "mixed";

    /** Идёт перетаскивание выделенных объектов? */
    isDragging: boolean;

    /** Начальная позиция drag (SVG-координаты) */
    dragStartPos?: Pos;

    /** Начальные позиции объектов до drag (для delta) */
    dragOriginalPositions?: Map<string, Pos>;
}

/**
 * DragPan — перетаскивание холста.
 * Может быть вызван из ЛЮБОГО состояния (Space/MMB).
 * При завершении — возвращаемся в previousState.
 * Курсор: grabbing.
 */
interface DragPanState {
    tool: "dragPan";

    /** Состояние, в которое вернёмся после окончания pan */
    previousState: Exclude<ToolState, DragPanState>;

    /** Начальная позиция мыши (screen px) */
    startScreenPos: Pos;

    /** ViewBox на момент начала pan */
    startViewBox: ViewBox;
}

/**
 * Placement — размещение точечного объекта (опора, здание, светофор...).
 * Курсор: crosshair.
 */
interface PlacementState {
    tool: "placement";

    /** Что именно размещаем */
    entityConfig: PlaceableEntityConfig;

    /** Текущая позиция «призрака» (null пока мышь не двигалась) */
    previewPos: Pos | null;

    /** Информация о привязке */
    snapInfo: SnapInfo | null;

    /** Ctrl зажат — серийное размещение (после клика остаёмся в Placement) */
    isRepeating: boolean;
}

/**
 * MultiSelect — рамка выделения (лассо).
 * Возникает при mousedown в пустоте.
 * Курсор: crosshair.
 */
interface MultiSelectState {
    tool: "multiSelect";

    /** Начальная точка рамки (SVG) */
    startPos: Pos;

    /** Текущая точка рамки (SVG) */
    currentPos: Pos;

    /** ID объектов, попавших в рамку (обновляется на каждый mousemove) */
    candidateIds: string[];

    /** Типы объектов, попавших в рамку */
    candidateType: EntityType | "mixed" | null;
}

// ── Приоритет 2 (заглушки — реализация позже) ──────────────────────────────

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

export class UIStore {
    toolState: ToolState = { tool: "idle" };

    viewBox: ViewBox = { x: 0, y: 0, width: 2400, height: 500 };

    /** Минимальный и максимальный zoom (ширина viewBox) */
    readonly minViewBoxWidth = 200;
    readonly maxViewBoxWidth = 20000;

    // ── Keyboard modifiers ──────────────────────────────────────────────────
    isSpaceHeld = false;
    isCtrlHeld = false;
    isShiftHeld = false;

    // ── Hover ───────────────────────────────────────────────────────────────
    hoveredEntityId: string | null = null;
    hoveredEntityType: EntityType | null = null;

    constructor() {
        makeAutoObservable(this, {
            minViewBoxWidth: false,
            maxViewBoxWidth: false,
        });
    }

    /** Текущие выделенные ID (удобный геттер для компонентов).
     *  Проходит сквозь dragPan, чтобы панель не пропадала при Space+drag. */
    //TODO: не лучше ли хранить выбранные id объектов в Set, чтобы при проверках не перебирать
    //элементы массива?
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

    //TODO: как будто нужен для этого дела сервис. ToolStateService.
    //ToolStateStore будет хранить выбранный режим, а в сервисе вся логика изменения
    //К слову, сервисы не должны быть как-то связан с mobx
    //не должен быть observable в сервисах, только в store
    // `this.toolState = { tool: "idle" };` выглядит не очень. Когда будет ToolStateStore,
    //то в нем будет `this.toolStateStore.set("idle")`

    /** Переключить в режим выделения (без активного выбора) */
    resetToIdle() {
        this.toolState = { tool: "idle" };
    }

    //--------------------------------
    //TODO: ЗДЕСЬ ОСТАНОВИЛСЯ СМОТРЕТЬ
    //--------------------------------

    /** Выделить один объект (обычный клик) */
    selectEntity(id: string, entityType: EntityType) {
        this.toolState = {
            tool: "selection",
            selectedIds: [id],
            selectedType: entityType,
            isDragging: false,
        };
    }

    /** Добавить/убрать из выделения (Shift+клик) */
    toggleEntityInSelection(id: string, entityType: EntityType) {
        if (this.toolState.tool !== "selection") {
            this.selectEntity(id, entityType);
            return;
        }

        const ids = [...this.toolState.selectedIds];
        const idx = ids.indexOf(id);

        if (idx >= 0) {
            ids.splice(idx, 1);
            if (ids.length === 0) {
                this.toolState = { tool: "idle" };
                return;
            }
        } else {
            ids.push(id);
        }

        const currentType = this.toolState.selectedType;
        const newType =
            currentType === entityType || currentType === "mixed"
                ? ids.length > 0
                    ? currentType === "mixed"
                        ? "mixed"
                        : entityType
                    : entityType
                : "mixed";

        this.toolState = {
            ...this.toolState,
            selectedIds: ids,
            selectedType: newType,
        };
    }

    /** Начать drag выделенных объектов */
    startDragSelection(startPos: Pos, originalPositions: Map<string, Pos>) {
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

    /** Закончить drag */
    endDragSelection() {
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

    // ── Pan ─────────────────────────────────────────────────────────────────

    startPan(screenPos: Pos) {
        const prev = this.toolState.tool === "dragPan" ? this.toolState.previousState : this.toolState;

        this.toolState = {
            tool: "dragPan",
            previousState: prev as Exclude<ToolState, DragPanState>,
            startScreenPos: screenPos,
            startViewBox: { ...this.viewBox },
        };
    }

    /**
     * Обновить позицию pan.
     * deltaSvg — уже в SVG-единицах (масштабирование выполняет InputHandler).
     */
    updatePan(deltaSvgX: number, deltaSvgY: number) {
        if (this.toolState.tool !== "dragPan") {
            return;
        }

        const { startViewBox } = this.toolState;
        this.viewBox = {
            ...startViewBox,
            x: startViewBox.x - deltaSvgX,
            y: startViewBox.y - deltaSvgY,
        };
    }

    endPan() {
        if (this.toolState.tool !== "dragPan") {
            return;
        }
        this.toolState = this.toolState.previousState;
    }

    // ── Zoom ────────────────────────────────────────────────────────────────

    /**
     * Zoom к точке (svgPos — координаты под курсором в SVG).
     * factor > 1 — zoom out, factor < 1 — zoom in.
     */
    zoom(svgPos: Pos, factor: number) {
        const newWidth = Math.max(this.minViewBoxWidth, Math.min(this.maxViewBoxWidth, this.viewBox.width * factor));
        const newHeight = (newWidth / this.viewBox.width) * this.viewBox.height;

        const ratioX = (svgPos.x - this.viewBox.x) / this.viewBox.width;
        const ratioY = (svgPos.y - this.viewBox.y) / this.viewBox.height;

        this.viewBox = {
            x: svgPos.x - ratioX * newWidth,
            y: svgPos.y - ratioY * newHeight,
            width: newWidth,
            height: newHeight,
        };
    }

    // ── Placement ───────────────────────────────────────────────────────────

    /** Активировать инструмент размещения (из любого состояния) */
    startPlacement(config: PlaceableEntityConfig) {
        this.toolState = {
            tool: "placement",
            entityConfig: config,
            previewPos: null,
            snapInfo: null,
            isRepeating: false,
        };
    }

    /** Обновить позицию призрака и snap */
    updatePlacementPreview(pos: Pos, snapInfo: SnapInfo | null) {
        if (this.toolState.tool !== "placement") {
            return;
        }
        this.toolState.previewPos = snapInfo?.snappedPos ?? pos;
        this.toolState.snapInfo = snapInfo;
    }

    /** Установить режим повтора (Ctrl) */
    setPlacementRepeating(repeating: boolean) {
        if (this.toolState.tool !== "placement") {
            return;
        }
        this.toolState.isRepeating = repeating;
    }

    /**
     * Переключить подтип размещаемого объекта (Tab).
     */
    cyclePlacementSubtype() {
        if (this.toolState.tool !== "placement") {
            return;
        }
        const cfg = this.toolState.entityConfig;

        if (cfg.kind === "catenaryPole") {
            const cycle: Array<"none" | "single" | "double"> = ["none", "single", "double"];
            const idx = cycle.indexOf(cfg.consoleType);
            this.toolState.entityConfig = {
                ...cfg,
                consoleType: cycle[(idx + 1) % cycle.length],
            };
        }

        if (cfg.kind === "vlPole") {
            const cycle: Array<"intermediate" | "angular" | "terminal"> = ["intermediate", "angular", "terminal"];
            const idx = cycle.indexOf(cfg.vlType);
            this.toolState.entityConfig = {
                ...cfg,
                vlType: cycle[(idx + 1) % cycle.length],
            };
        }
    }

    /**
     * Подтвердить размещение.
     * После размещения: если isRepeating — остаёмся, иначе → Idle.
     */
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

    // ── MultiSelect ─────────────────────────────────────────────────────────

    startMultiSelect(startPos: Pos) {
        this.toolState = {
            tool: "multiSelect",
            startPos,
            currentPos: startPos,
            candidateIds: [],
            candidateType: null,
        };
    }

    updateMultiSelect(currentPos: Pos, candidateIds: string[], candidateType: EntityType | "mixed" | null) {
        if (this.toolState.tool !== "multiSelect") {
            return;
        }
        this.toolState.currentPos = currentPos;
        this.toolState.candidateIds = candidateIds;
        this.toolState.candidateType = candidateType;
    }

    /** Завершить рамку выделения → перейти в Selection */
    commitMultiSelect() {
        if (this.toolState.tool !== "multiSelect") {
            return;
        }

        const { candidateIds, candidateType } = this.toolState;

        if (candidateIds.length === 0) {
            this.toolState = { tool: "idle" }; // остаёмся в режиме выделения
            return;
        }

        this.toolState = {
            tool: "selection",
            selectedIds: [...candidateIds],
            selectedType: candidateType ?? "mixed",
            isDragging: false,
        };
    }

    // ── Hover ───────────────────────────────────────────────────────────────

    setHover(id: string | null, type: EntityType | null) {
        this.hoveredEntityId = id;
        this.hoveredEntityType = type;
    }

    // ── Keyboard modifiers ──────────────────────────────────────────────────

    setSpaceHeld(held: boolean) {
        this.isSpaceHeld = held;
    }

    setCtrlHeld(held: boolean) {
        this.isCtrlHeld = held;
        if (this.toolState.tool === "placement") {
            this.toolState.isRepeating = held;
        }
    }

    setShiftHeld(held: boolean) {
        this.isShiftHeld = held;
    }
}
