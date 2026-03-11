// ============================================================================
// UIStore — управление состоянием UI и инструментов
// ============================================================================
//
// Центральный стор UI. Хранит:
// - текущее состояние инструмента (ToolState)
// - viewBox (pan/zoom)
// - историю undo/redo
//
// Все мутации состояния — через action-методы.
// Компоненты подписываются на computed-свойства (cursorStyle, statusHint...).
// ============================================================================

//TODO: разбить этот монолит на различные сервисы по назначению. В хранилище храним только данные,
//функционал будет в сервисах
import { makeAutoObservable } from "mobx";
import type {
    ToolState,
    DragPanState,
    ViewBox,
    SnapInfo,
    PlaceableEntityConfig,
    EntityType,
    Command,
    SelectionState,
} from "@/shared/types/toolTypes";
import type { Pos } from "@/shared/types/catenaryTypes";

// ── Undo Store (встроенный) ─────────────────────────────────────────────────

class UndoStack {
    undoStack: Command[] = [];
    redoStack: Command[] = [];
    maxSize = 100;

    constructor() {
        makeAutoObservable(this);
    }

    execute(cmd: Command) {
        cmd.execute();
        this.undoStack.push(cmd);
        if (this.undoStack.length > this.maxSize) {
            this.undoStack.shift();
        }
        this.redoStack = [];
    }

    undo() {
        const cmd = this.undoStack.pop();
        if (!cmd) return;
        cmd.undo();
        this.redoStack.push(cmd);
    }

    redo() {
        const cmd = this.redoStack.pop();
        if (!cmd) return;
        cmd.execute();
        this.undoStack.push(cmd);
    }

    get canUndo(): boolean {
        return this.undoStack.length > 0;
    }

    get canRedo(): boolean {
        return this.redoStack.length > 0;
    }

    get lastDescription(): string | null {
        const last = this.undoStack[this.undoStack.length - 1];
        return last?.description ?? null;
    }
}

// ── UIStore ─────────────────────────────────────────────────────────────────

export class UIStore {
    // ── Tool State ──────────────────────────────────────────────────────────
    toolState: ToolState = { tool: "idle" };

    // ── ViewBox (pan/zoom) ──────────────────────────────────────────────────
    viewBox: ViewBox = { x: 0, y: 0, width: 2400, height: 500 };

    /** Минимальный и максимальный zoom (ширина viewBox) */
    readonly minViewBoxWidth = 200;
    readonly maxViewBoxWidth = 20000;

    // ── Keyboard modifiers ──────────────────────────────────────────────────
    isSpaceHeld = false;
    isCtrlHeld = false;
    isShiftHeld = false;

    // ── Undo/Redo ───────────────────────────────────────────────────────────
    readonly undoStack = new UndoStack();

    // ── Hover ───────────────────────────────────────────────────────────────
    hoveredEntityId: string | null = null;
    hoveredEntityType: EntityType | null = null;

    constructor() {
        makeAutoObservable(this, {
            minViewBoxWidth: false,
            maxViewBoxWidth: false,
        });
    }

    // ========================================================================
    // Computed
    // ========================================================================

    /** CSS-курсор для SVG-контейнера */
    get cursorStyle(): string {
        if (this.isSpaceHeld) return "grab";

        switch (this.toolState.tool) {
        case "panTool":
            return "grab";
        case "idle":
            return this.hoveredEntityId ? "pointer" : "default";
        case "selection":
            if (this.toolState.isDragging) return "grabbing";
            return this.hoveredEntityId ? "pointer" : "default";
        case "dragPan":
            return "grabbing";
        case "placement":
            return "crosshair";
        case "multiSelect":
            return "crosshair";
        case "wireDrawing":
            return "crosshair";
        case "crossSpan":
            return "pointer";
        }
    }

    /** Текст подсказки для StatusBar */
    get statusHint(): string {
        switch (this.toolState.tool) {
        case "panTool":
            return "Режим перемещения · ЛКМ — перемещение холста · Колесо — масштаб";
        case "idle":
            return "Инструмент выделения · Клик — выбрать · Drag — рамка";
        case "selection": {
            const count = this.toolState.selectedIds.length;
            const noun = count === 1 ? "объект" : "объектов";
            return `Выбрано: ${count} ${noun} · Del — удалить · Shift+клик — добавить к выделению · ESC — снять`;
        }
        case "dragPan":
            return "Перемещение холста...";
        case "placement": {
            const name = this.placementLabel;
            const repeat = this.toolState.isRepeating
                ? " (серийное размещение)"
                : "";
            return `${name}${repeat} · Клик — разместить · Ctrl+клик — серия · Tab — сменить тип · ESC — отмена`;
        }
        case "multiSelect":
            return `Рамка выделения · Объектов в рамке: ${this.toolState.candidateIds.length}`;
        case "wireDrawing": {
            const n = this.toolState.placedPoints.length;
            if (n === 0) return "Кликните на точку фиксации для начала линии · ESC — отмена";
            return `Точек: ${n} · Клик — добавить · Enter — завершить · Backspace — убрать последнюю · ESC — отмена`;
        }
        case "crossSpan": {
            if (!this.toolState.poleAId)
                return "Кликните на первую опору · ESC — отмена";
            return "Кликните на вторую опору · ESC — отмена";
        }
        }
    }

    /** Метка размещаемого объекта (для StatusBar и превью) */
    get placementLabel(): string {
        if (this.toolState.tool !== "placement") return "";
        const cfg = this.toolState.entityConfig;
        switch (cfg.kind) {
        case "catenaryPole": {
            const consoleLabels = {
                none: "без консоли",
                single: "однопутная консоль",
                double: "двухпутная консоль",
            };
            return `Опора КС (${consoleLabels[cfg.consoleType]})`;
        }
        case "vlPole": {
            const vlLabels = {
                intermediate: "промежуточная",
                angular: "угловая",
                terminal: "концевая",
            };
            return `Опора ВЛ (${vlLabels[cfg.vlType]})`;
        }
        case "building":
            return "Здание";
        case "signal":
            return "Светофор";
        case "platform":
            return "Платформа";
        case "crossing":
            return "Переезд";
        case "spotlight":
            return "Прожекторная мачта";
        }
    }

    /** Текущие выделенные ID (удобный геттер для компонентов).
     *  Проходит сквозь dragPan, чтобы панель не пропадала при Space+drag. */
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

    /** Есть ли активный инструмент (не навигационные режимы) */
    get isToolActive(): boolean {
        const t = this.toolState.tool;
        return t !== "panTool" && t !== "idle" && t !== "selection";
    }

    // ========================================================================
    // Actions — переходы состояний
    // ========================================================================

    // ── Сброс состояний ────────────────────────────────────────────────────

    /** Переключить в режим выделения (без активного выбора) */
    resetToIdle() {
        this.toolState = { tool: "idle" };
    }

    /** Переключить в режим перемещения (по умолчанию) */
    resetToPan() {
        this.toolState = { tool: "panTool" };
    }

    // ── Escape — всегда возвращает в режим перемещения ──────────────────────

    handleEscape() {
        switch (this.toolState.tool) {
        case "idle":
            break; // уже в базовом режиме
        case "dragPan":
            this.toolState = { tool: "idle" };
            break;
        default:
            this.toolState = { tool: "idle" };
            break;
        }
    }

    // ── Selection ───────────────────────────────────────────────────────────

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
        if (this.toolState.tool !== "selection") return;
        this.toolState = {
            ...this.toolState,
            isDragging: true,
            dragStartPos: startPos,
            dragOriginalPositions: originalPositions,
        };
    }

    /** Закончить drag */
    endDragSelection() {
        if (this.toolState.tool !== "selection") return;
        this.toolState = {
            ...this.toolState,
            isDragging: false,
            dragStartPos: undefined,
            dragOriginalPositions: undefined,
        };
    }

    // ── Pan ─────────────────────────────────────────────────────────────────

    startPan(screenPos: Pos) {
        const prev =
      this.toolState.tool === "dragPan"
          ? this.toolState.previousState
          : this.toolState;

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
        if (this.toolState.tool !== "dragPan") return;

        const { startViewBox } = this.toolState;
        this.viewBox = {
            ...startViewBox,
            x: startViewBox.x - deltaSvgX,
            y: startViewBox.y - deltaSvgY,
        };
    }

    endPan() {
        if (this.toolState.tool !== "dragPan") return;
        this.toolState = this.toolState.previousState;
    }

    // ── Zoom ────────────────────────────────────────────────────────────────

    /**
     * Zoom к точке (svgPos — координаты под курсором в SVG).
     * factor > 1 — zoom out, factor < 1 — zoom in.
     */
    zoom(svgPos: Pos, factor: number) {
        const newWidth = Math.max(
            this.minViewBoxWidth,
            Math.min(this.maxViewBoxWidth, this.viewBox.width * factor),
        );
        const newHeight =
      (newWidth / this.viewBox.width) * this.viewBox.height;

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
        if (this.toolState.tool !== "placement") return;
        this.toolState.previewPos = snapInfo?.snappedPos ?? pos;
        this.toolState.snapInfo = snapInfo;
    }

    /** Установить режим повтора (Ctrl) */
    setPlacementRepeating(repeating: boolean) {
        if (this.toolState.tool !== "placement") return;
        this.toolState.isRepeating = repeating;
    }

    /**
     * Переключить подтип размещаемого объекта (Tab).
     */
    cyclePlacementSubtype() {
        if (this.toolState.tool !== "placement") return;
        const cfg = this.toolState.entityConfig;

        if (cfg.kind === "catenaryPole") {
            const cycle: Array<"none" | "single" | "double"> = [
                "none",
                "single",
                "double",
            ];
            const idx = cycle.indexOf(cfg.consoleType);
            this.toolState.entityConfig = {
                ...cfg,
                consoleType: cycle[(idx + 1) % cycle.length],
            };
        }

        if (cfg.kind === "vlPole") {
            const cycle: Array<"intermediate" | "angular" | "terminal"> = [
                "intermediate",
                "angular",
                "terminal",
            ];
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
        if (this.toolState.tool !== "placement") return null;
        if (!this.toolState.previewPos) return null;

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
        if (this.toolState.tool !== "multiSelect") return;
        this.toolState.currentPos = currentPos;
        this.toolState.candidateIds = candidateIds;
        this.toolState.candidateType = candidateType;
    }

    /** Завершить рамку выделения → перейти в Selection */
    commitMultiSelect() {
        if (this.toolState.tool !== "multiSelect") return;

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
