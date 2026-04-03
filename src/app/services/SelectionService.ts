import type { Pos } from "@/shared/types/catenaryTypes";
import type { EntityType, ViewBox } from "@/shared/types/toolTypes";

import type { ToolStateStore } from "../store/ToolStateStore";
import type { SelectionStore } from "../store/SelectionStore";
import type { UIPanelsStore } from "../store/UIPanelsStore";
import type { HitTestService } from "./HitTestService";
import type { DragService } from "./DragService";
import type { EntityService } from "./EntityService";
import type { CameraService } from "./CameraService";

/** Порог в экранных пикселях: меньше — клик, больше — drag */
const DRAG_THRESHOLD = 4;

export class SelectionService {
    private _mouseDownScreen: Pos | null = null;
    private _dragStartSvgPos: Pos | null = null;
    private _pendingClick: { id: string; type: EntityType } | "empty" | null = null;
    private _isDragging = false;

    constructor(
        private readonly toolStateStore: ToolStateStore,
        private readonly selectionStore: SelectionStore,
        private readonly hitTestService: HitTestService,
        private readonly dragService: DragService,
        private readonly entityService: EntityService,
        private readonly uiPanelStore: UIPanelsStore,
        private readonly cameraService: CameraService,
    ) {}

    onMouseDown(svgPos: Pos, screenPos: Pos, viewBox: ViewBox, svgClientWidth: number): void {
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

    onMouseMove(svgPos: Pos, screenPos: Pos): void {
        if (!this._mouseDownScreen || this._isDragging) {
            return;
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
                const origPositions = this.dragService.snapshotPositions(this.selectionStore.selectedIds);
                this.toolStateStore.startDragEntities(this._dragStartSvgPos, this._pendingClick.id, origPositions);
                this._pendingClick = null;
            } else if (this._pendingClick === "empty") {
                this.toolStateStore.startMultiSelect(svgPos);
                this._pendingClick = null;
            }
        }
    }

    onDragMove(svgPos: Pos, shiftKey: boolean): void {
        const { toolState } = this.toolStateStore;
        if (toolState.tool !== "dragEntities") {
            return;
        }

        let dx = svgPos.x - toolState.startSvgPos.x;
        let dy = svgPos.y - toolState.startSvgPos.y;

        if (shiftKey) {
            if (toolState.axisLock === "none") {
                this.toolStateStore.setDragAxisLock(Math.abs(dx) >= Math.abs(dy) ? "x" : "y");
            }
            if (toolState.axisLock === "x") {
                dy = 0;
            } else if (toolState.axisLock === "y") {
                dx = 0;
            }
        } else if (toolState.axisLock !== "none") {
            this.toolStateStore.setDragAxisLock("none");
        }

        this.dragService.updateDrag(toolState.originalPositions, dx, dy);
    }

    onMultiSelectMove(svgPos: Pos): void {
        if (this._isDragging) {
            this.toolStateStore.updateMultiSelect(svgPos);
        }
    }

    onMouseUp(svgPos: Pos, shiftKey: boolean): void {
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

        this.reset();
    }

    onDragLeave(): void {
        const { toolState } = this.toolStateStore;
        if (toolState.tool === "dragEntities") {
            this.dragService.cancelDrag(toolState.originalPositions);
            this.toolStateStore.resetToIdle();
        }
        this.reset();
    }

    onEscape(): void {
        const { toolState } = this.toolStateStore;
        if (toolState.tool === "dragEntities") {
            this.dragService.cancelDrag(toolState.originalPositions);
            this.toolStateStore.resetToIdle();
            this.reset();
        }
    }

    reset(): void {
        this._mouseDownScreen = null;
        this._dragStartSvgPos = null;
        this._pendingClick = null;
        this._isDragging = false;
    }
}
