import type { Pos } from "@/shared/types/catenaryTypes";
import type { EntityType, ViewBox } from "@/shared/types/toolTypes";

import type { ToolStateStore } from "../store/ToolStateStore";
import type { SelectionStore } from "../store/SelectionStore";
import type { UIPanelsStore } from "../store/UIPanelsStore";
import type { HitTestService } from "./HitTestService";

/** Порог в экранных пикселях: меньше — клик, больше — drag */
const DRAG_THRESHOLD = 4;

/** Возвращается из updateGesture, когда жест распознан как начало drag */
interface DragIntent {
    startSvgPos: Pos;
    anchorId: string;
}

export class SelectionToolService {
    private _mouseDownScreen: Pos | null = null;
    private _dragStartSvgPos: Pos | null = null;
    private _pendingClick: { id: string; type: EntityType } | "empty" | null = null;
    private _isDragging = false;

    constructor(
        private readonly toolStateStore: ToolStateStore,
        private readonly selectionStore: SelectionStore,
        private readonly hitTestService: HitTestService,
        private readonly uiPanelStore: UIPanelsStore,
    ) {}

    /** Запоминает нажатие и определяет, что находится под курсором. */
    beginGesture(svgPos: Pos, screenPos: Pos, viewBox: ViewBox, svgClientWidth: number): void {
        this._mouseDownScreen = screenPos;
        this._dragStartSvgPos = svgPos;
        this._isDragging = false;
        this._pendingClick = null;

        const hit = this.hitTestService.hitTest(svgPos, screenPos, viewBox, svgClientWidth);

        if (hit.entity) {
            if (hit.entity.type === "fixingPoint" && hit.fixingPoint) {
                // FixingPoint → выделяем родительскую опору
                this._pendingClick = { id: hit.fixingPoint.poleId, type: "catenaryPole" };
            } else {
                this._pendingClick = { id: hit.entity.id, type: hit.entity.type };
            }
        } else {
            this._pendingClick = "empty";
        }
    }

    /**
     * Отслеживает жест мыши при зажатой кнопке.
     * Возвращает DragIntent, если порог пройден по уже выделенному объекту.
     * Запускает лассо, если курсор двинулся по пустому месту.
     */
    updateGesture(svgPos: Pos, screenPos: Pos): DragIntent | null {
        if (!this._mouseDownScreen || this._isDragging) {
            return null;
        }

        const dx = screenPos.x - this._mouseDownScreen.x;
        const dy = screenPos.y - this._mouseDownScreen.y;

        if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
            this._isDragging = true;

            if (
                this._pendingClick &&
                this._pendingClick !== "empty" &&
                this.selectionStore.isSelected(this._pendingClick.id) &&
                this._dragStartSvgPos
            ) {
                const intent: DragIntent = { startSvgPos: this._dragStartSvgPos, anchorId: this._pendingClick.id };
                this._pendingClick = null;
                return intent;
            } else if (this._pendingClick === "empty") {
                this.toolStateStore.startMultiSelect(svgPos);
                this._pendingClick = null;
            }
        }

        return null;
    }

    /** Обновляет прямоугольник лассо во время multiSelect. */
    updateMultiSelect(svgPos: Pos): void {
        if (this._isDragging) {
            this.toolStateStore.updateMultiSelect(svgPos);
        }
    }

    /** Завершает жест: фиксирует лассо или выполняет клик по объекту. */
    endGesture(svgPos: Pos, shiftKey: boolean): void {
        const { toolState } = this.toolStateStore;
        const { tool } = toolState;

        if (tool === "multiSelect") {
            const candidates = this.hitTestService.hitTestRect(toolState.startPos, svgPos);
            if (candidates.length > 0) {
                const types = [...new Set(candidates.map((c) => c.type))];
                const type = types.length === 1 ? types[0] : "mixed";
                this.selectionStore.setMulti(
                    candidates.map((c) => c.id),
                    type,
                );
            }
            this.toolStateStore.endMultiSelect();
        } else if (this._pendingClick && this._pendingClick !== "empty" && !this._isDragging) {
            // Клик по объекту: shift — добавить к выделению, иначе — заменить
            if (shiftKey) {
                this.selectionStore.toggle(this._pendingClick.id, this._pendingClick.type);
            } else {
                this.selectionStore.select(this._pendingClick.id, this._pendingClick.type);
            }

            if (this._pendingClick.type === "catenaryPole") {
                this.uiPanelStore.openPoleEditorPanel();
            }
        }
        // Клик по пустому месту — выделение НЕ сбрасывается (только Escape)

        this.resetGesture();
    }

    getSelected(): string[] {
        return this.selectionStore.selectedIds;
    }

    /** Сбрасывает выделение и внутренние флаги жеста. */
    clearSelection(): void {
        this.selectionStore.clear();
        this.resetGesture();
    }

    /** Сбрасывает только внутренние флаги жеста, не трогая выделение. */
    resetGesture(): void {
        this._mouseDownScreen = null;
        this._dragStartSvgPos = null;
        this._pendingClick = null;
        this._isDragging = false;
    }
}
