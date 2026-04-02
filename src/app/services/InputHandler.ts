import type { EntityType } from "@/shared/types/toolTypes";
import { screenToSvg, svgToScreen, getSvgClientWidth, getSvgPanScale } from "@/shared/svg/svgCoords";

import type { HitTestService } from "./HitTestService";
import type { EntityService } from "./EntityService";
import type { SnapService } from "./SnapService";
import type { CameraService } from "./CameraService";
import type { ToolStateStore } from "../store/ToolStateStore";
import type { SelectionStore } from "../store/SelectionStore";
import type { UndoStackStore } from "../store/UndoStackStore";
import type { UIPanelsStore } from "../store/UIPanelsStore";
import type { InlineEditStore } from "../store/InlineEditStore";

/** Порог в экранных пикселях: меньше — клик, больше — drag */
const DRAG_THRESHOLD = 4;
//TODO: Класс разросся до огромного состояния. Нужен рефакторинг.
export class InputHandlerService {
    private _svgElement: SVGSVGElement | null = null;

    private _mouseDownScreen: { x: number; y: number } | null = null;
    private _dragStartSvgPos: { x: number; y: number } | null = null;
    private _pendingClick: { id: string; type: EntityType } | "empty" | null = null;
    private _isDragging = false;

    constructor(
        private toolStateStore: ToolStateStore,
        private selectionStore: SelectionStore,
        private cameraService: CameraService,
        private hitTestService: HitTestService | null = null,
        private snapService: SnapService | null = null,
        private entityService: EntityService | null = null,
        private undoStackStore: UndoStackStore | null = null,
        private uiPanelStore: UIPanelsStore,
        private inlineEditStore: InlineEditStore | null = null,
    ) {}

    setSvgElement(el: SVGSVGElement | null): void {
        this._svgElement = el;
    }

    mount(): void {
        window.addEventListener("keydown", this.handleKeyDown);
        window.addEventListener("keyup", this.handleKeyUp);
    }

    unmount(): void {
        window.removeEventListener("keydown", this.handleKeyDown);
        window.removeEventListener("keyup", this.handleKeyUp);
    }

    onMouseDown = (e: React.MouseEvent<SVGSVGElement>): void => {
        (document.activeElement as HTMLElement)?.blur();

        const { toolState } = this.toolStateStore;
        const { tool } = toolState;

        const isClickedMainButton = e.button === 0;
        const isClickedMiddleButton = e.button === 1;

        if (isClickedMiddleButton || (isClickedMainButton && tool === "panTool")) {
            e.preventDefault();
            this.cameraService.startPan({ x: e.clientX, y: e.clientY });
            return;
        }

        if (isClickedMainButton && tool === "placement") {
            e.preventDefault();
            const result = this.toolStateStore.commitPlacement();

            if (result) {
                this.entityService?.createEntity(result.pos, result.config, result.snap);
            }

            return;
        }

        if (isClickedMainButton && tool === "crossSpan") {
            e.preventDefault();
            const svgPos = this._toSvg(e.clientX, e.clientY);
            const svgPerPx = this._getSvgPerPx();
            if (svgPerPx === null) {
                return;
            }
            const hit = this.hitTestService?.hitTestPoleOnly(svgPos, svgPerPx);
            if (!hit) {
                return;
            }
            const ts = this.toolStateStore.toolState;
            if (ts.tool !== "crossSpan") {
                return;
            }
            if (!ts.poleAId) {
                this.toolStateStore.setCrossSpanPoleA(hit.id);
            } else {
                this.toolStateStore.setCrossSpanPreviewPoleB(hit.id);
                const result = this.toolStateStore.commitCrossSpan();
                if (result) {
                    this.entityService?.createCrossSpan(result.spanType, result.poleAId, result.poleBId);
                }
            }
            return;
        }

        // Клики для выделения работают из idle, panTool и dragPan
        if (isClickedMainButton && tool !== "multiSelect") {
            e.preventDefault();
            const svgPos = this._toSvg(e.clientX, e.clientY);
            this._recordPendingClick(svgPos, { x: e.clientX, y: e.clientY });
            return;
        }
    };

    onMouseMove = (e: React.MouseEvent<SVGSVGElement>): void => {
        const { toolState } = this.toolStateStore;
        const { tool } = toolState;

        if (tool === "dragPan") {
            this._moveDragPan(e);
            return;
        }

        const svgPos = this._toSvg(e.clientX, e.clientY);

        if (tool === "placement") {
            this._movePlacementPreview(svgPos);
            return;
        }

        if (tool === "crossSpan" && toolState.tool === "crossSpan" && toolState.poleAId) {
            const svgPerPx = this._getSvgPerPx();
            if (svgPerPx !== null) {
                const hit = this.hitTestService?.hitTestPoleOnly(svgPos, svgPerPx);
                this.toolStateStore.setCrossSpanPreviewPoleB(hit?.id ?? null);
            }
            return;
        }

        if (tool === "dragEntities") {
            this._moveDragEntities(e, svgPos);
            return;
        }

        this._updateDragThreshold(e, svgPos);

        if (tool === "multiSelect" && this._isDragging) {
            this.toolStateStore.updateMultiSelect(svgPos);
            return;
        }
    };

    onMouseUp = (e: React.MouseEvent<SVGSVGElement>): void => {
        const { toolState } = this.toolStateStore;
        const { tool } = toolState;

        if (tool === "dragEntities") {
            if (this.entityService) {
                this.entityService.commitDrag(toolState.originalPositions);
            }
            this.toolStateStore.resetToIdle();
            this._reset();
            return;
        }

        if (tool === "dragPan") {
            this.cameraService.endPan();
        } else if (tool === "multiSelect") {
            // hitTestRect вызывается один раз на mouseup
            if (this.hitTestService) {
                const svgPos = this._toSvg(e.clientX, e.clientY);
                const candidates = this.hitTestService.hitTestRect(toolState.startPos, svgPos);
                if (candidates.length > 0) {
                    const types = [...new Set(candidates.map((c) => c.type))];
                    const type = types.length === 1 ? types[0] : "mixed";
                    this.selectionStore.setMulti(
                        candidates.map((c) => c.id),
                        type,
                    );
                }
            }
            this.toolStateStore.endMultiSelect();
        } else if (this._pendingClick && this._pendingClick !== "empty" && !this._isDragging) {
            // Клик по объекту: shift — добавить к выделению, иначе — заменить
            if (e.shiftKey) {
                this.selectionStore.toggle(this._pendingClick.id, this._pendingClick.type);
            } else {
                this.selectionStore.select(this._pendingClick.id, this._pendingClick.type);
            }

            if (this._pendingClick.type === "catenaryPole") {
                this.uiPanelStore.openPoleEditorPanel();
            }
        }
        // Клик по пустому месту — выделение НЕ сбрасывается (только Escape)

        this._reset();
    };

    onMouseLeave = (_e: React.MouseEvent<SVGSVGElement>): void => {
        const { toolState } = this.toolStateStore;

        if (toolState.tool === "dragEntities") {
            this.entityService?.cancelDrag(toolState.originalPositions);
            this.toolStateStore.resetToIdle();
        }
        if (toolState.tool === "dragPan") {
            this.cameraService.endPan();
        }
        if (toolState.tool === "placement") {
            toolState.previewPos = null;
        }

        this._reset();
    };

    onWheel = (e: WheelEvent): void => {
        if (!this._svgElement) {
            return;
        }
        e.preventDefault();
        const factor = e.deltaY > 0 ? 1.1 : 0.9;
        const svgPos = screenToSvg(this._svgElement, e.clientX, e.clientY);
        this.cameraService.zoom(svgPos, factor);
    };

    // ── Private: декомпозиция onMouseDown ────────────────────────────────────

    private _recordPendingClick(svgPos: { x: number; y: number }, screenPos: { x: number; y: number }): void {
        this._mouseDownScreen = screenPos;
        this._dragStartSvgPos = svgPos;
        this._isDragging = false;
        this._pendingClick = null;

        if (!this.hitTestService || !this._svgElement) {
            return;
        }

        const clientWidth = getSvgClientWidth(this._svgElement);
        const hit = this.hitTestService.hitTest(svgPos, screenPos, this.cameraService.viewBox, clientWidth);

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

    // ── Private: декомпозиция onMouseMove ────────────────────────────────────

    private _moveDragPan(e: React.MouseEvent<SVGSVGElement>): void {
        const { toolState } = this.toolStateStore;
        if (toolState.tool !== "dragPan" || !this._svgElement) {
            return;
        }

        const panScale = getSvgPanScale(this._svgElement);
        if (!panScale) {
            return;
        }

        const dx = (e.clientX - toolState.startScreenPos.x) * panScale.x;
        const dy = (e.clientY - toolState.startScreenPos.y) * panScale.y;
        this.cameraService.updatePan(dx, dy);
    }

    private _movePlacementPreview(svgPos: { x: number; y: number }): void {
        if (!this.snapService || !this._svgElement) {
            return;
        }
        const { toolState } = this.toolStateStore;
        if (toolState.tool !== "placement") {
            return;
        }
        const snap = this.snapService.calcSnap(svgPos, toolState.entityConfig);
        this.toolStateStore.updatePlacementPreview(svgPos, snap);
    }

    private _moveDragEntities(e: React.MouseEvent<SVGSVGElement>, svgPos: { x: number; y: number }): void {
        const { toolState } = this.toolStateStore;
        if (toolState.tool !== "dragEntities" || !this.entityService) {
            return;
        }

        let dx = svgPos.x - toolState.startSvgPos.x;
        let dy = svgPos.y - toolState.startSvgPos.y;

        if (e.shiftKey) {
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

        this.entityService.updateDrag(toolState.originalPositions, dx, dy);
    }

    private _updateDragThreshold(e: React.MouseEvent<SVGSVGElement>, svgPos: { x: number; y: number }): void {
        if (!this._mouseDownScreen || this._isDragging) {
            return;
        }

        const dx = e.clientX - this._mouseDownScreen.x;
        const dy = e.clientY - this._mouseDownScreen.y;

        if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
            this._isDragging = true;

            if (
                this._pendingClick &&
                this._pendingClick !== "empty" &&
                this.selectionStore.isSelected(this._pendingClick.id) &&
                this.entityService &&
                this._dragStartSvgPos
            ) {
                const origPositions = this.entityService.snapshotPositions(this.selectionStore.selectedIds);
                this.toolStateStore.startDragEntities(this._dragStartSvgPos, this._pendingClick.id, origPositions);
                this._pendingClick = null;
            } else if (this._pendingClick === "empty") {
                this.toolStateStore.startMultiSelect(svgPos);
                this._pendingClick = null;
            }
        }
    }

    private _getSvgPerPx(): number | null {
        if (!this._svgElement) {
            return null;
        }
        const clientWidth = getSvgClientWidth(this._svgElement);
        if (clientWidth === 0) {
            return null;
        }
        return this.cameraService.viewBox.width / clientWidth;
    }

    private _toSvg(clientX: number, clientY: number): { x: number; y: number } {
        if (!this._svgElement) {
            return { x: clientX, y: clientY };
        }
        return screenToSvg(this._svgElement, clientX, clientY);
    }

    private _reset(): void {
        this._mouseDownScreen = null;
        this._dragStartSvgPos = null;
        this._pendingClick = null;
        this._isDragging = false;
    }

    // ── Double-click: inline edit ────────────────────────────────────────────

    onDoubleClick = (e: React.MouseEvent<SVGSVGElement>): void => {
        if (!this._svgElement || !this.inlineEditStore || !this.hitTestService) {
            return;
        }

        const svgPos = this._toSvg(e.clientX, e.clientY);
        const target = this.hitTestService.hitTestEditTarget(svgPos);
        if (!target) {
            return;
        }

        const screenPos = svgToScreen(this._svgElement, target.svgPos.x, target.svgPos.y);
        const container = this._svgElement.parentElement;
        if (!container) {
            return;
        }

        const rect = container.getBoundingClientRect();
        const containerPos = { x: screenPos.x - rect.left, y: screenPos.y - rect.top };

        this.inlineEditStore.startEdit({
            target: target.editTarget,
            screenPos: containerPos,
            initialValue: target.initialValue,
        });
    };

    // ── Клавиатура ───────────────────────────────────────────────────────────

    private handleKeyDown = (e: KeyboardEvent): void => {
        const target = e.target as HTMLElement;
        const inInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

        if (e.repeat) {
            return;
        }

        if (inInput) {
            if (e.key === "Escape") {
                target.blur();
            }

            return;
        }

        if (e.key === "Escape") {
            const { toolState } = this.toolStateStore;
            if (toolState.tool === "dragEntities") {
                this.entityService?.cancelDrag(toolState.originalPositions);
                this.toolStateStore.resetToIdle();
                this._reset();
                return;
            }
            if (toolState.tool === "crossSpan") {
                this.toolStateStore.resetToIdle();
                return;
            }

            this.selectionStore.clear();
            this.uiPanelStore.closePoleEditorPanel();
        }

        if (e.key === "Delete" && this.selectionStore.hasSelection) {
            const ids = this.selectionStore.selectedIds;
            this.entityService?.deleteEntities(ids);
            this.selectionStore.clear();
        }

        if (e.ctrlKey && e.key === "z") {
            e.preventDefault();
            this.undoStackStore?.undo();
        }

        if (e.ctrlKey && e.key === "y") {
            e.preventDefault();
            this.undoStackStore?.redo();
        }

        if (e.ctrlKey) {
            this.toolStateStore.setPlacementRepeating(true);
        }
    };

    private handleKeyUp = (e: KeyboardEvent): void => {
        if (!e.ctrlKey) {
            this.toolStateStore.setPlacementRepeating(false);
        }
    };
}
