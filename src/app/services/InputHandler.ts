import type { EntityType } from "@/shared/types/toolTypes";
import { screenToSvg, getSvgClientWidth, getSvgPanScale } from "@/shared/svg/svgCoords";

import type { HitTestService } from "./HitTestService";
import type { EntityService } from "./EntityService";
import type { SnapService } from "./SnapService";
import type { CameraService } from "./CameraService";
import type { ToolStateStore } from "../store/ToolStateStore";
import type { UndoStackStore } from "../store/UndoStackStore";

/** Порог в экранных пикселях: меньше — клик, больше — drag */
const DRAG_THRESHOLD = 4;

export class InputHandlerService {
    private svgElement: SVGSVGElement | null = null;

    private _mouseDownScreen: { x: number; y: number } | null = null;
    private _pendingClick: { id: string; type: EntityType } | "empty" | null = null;
    private _isDragging = false;

    constructor(
        private toolStateStore: ToolStateStore,
        private cameraService: CameraService,
        private hitTestService: HitTestService | null = null,
        private snapService: SnapService | null = null,
        private entityService: EntityService | null = null,
        private undoStackStore: UndoStackStore | null = null,
    ) {}

    setSvgElement(el: SVGSVGElement | null): void {
        this.svgElement = el;
    }

    mount(): void {
        window.addEventListener("keydown", this.handleKeyDown);
        window.addEventListener("keyup", this.handleKeyUp);
    }

    unmount(): void {
        window.removeEventListener("keydown", this.handleKeyDown);
        window.removeEventListener("keyup", this.handleKeyUp);
    }

    // ── Обработчики мыши ─────────────────────────────────────────────────────

    onMouseDown = (e: React.MouseEvent<SVGSVGElement>): void => {
        (document.activeElement as HTMLElement)?.blur();

        const isPanTool = this.toolStateStore.toolState.tool === "panTool";

        if (e.button === 1 || (e.button === 0 && (this.toolStateStore.isSpaceHeld || isPanTool))) {
            e.preventDefault();
            this._startPan(e);
            return;
        }

        if (e.button !== 0) {
            return;
        }

        e.preventDefault();

        const { toolState } = this.toolStateStore;

        if (toolState.tool === "placement") {
            this._commitPlacement();
            return;
        }

        if (toolState.tool === "idle" || toolState.tool === "selection") {
            const svgPos = this._toSvg(e.clientX, e.clientY);
            this._recordPendingClick(svgPos, { x: e.clientX, y: e.clientY });
        }
    };

    onMouseMove = (e: React.MouseEvent<SVGSVGElement>): void => {
        const { toolState } = this.toolStateStore;

        if (toolState.tool === "dragPan") {
            this._moveDragPan(e);
            return;
        }

        const svgPos = this._toSvg(e.clientX, e.clientY);

        if (toolState.tool === "placement") {
            this._movePlacementPreview(svgPos);
            return;
        }

        this._updateDragThreshold(e, svgPos);

        if (this.toolStateStore.toolState.tool === "multiSelect" && this._isDragging) {
            this._moveLasso(svgPos);
            return;
        }

        if (!this._isDragging && !this._mouseDownScreen) {
            this._updateHover(svgPos, { x: e.clientX, y: e.clientY });
        }
    };

    onMouseUp = (e: React.MouseEvent<SVGSVGElement>): void => {
        const { toolState } = this.toolStateStore;

        if (toolState.tool === "dragPan") {
            this.cameraService.endPan();
            this._reset();
            return;
        }

        if (toolState.tool === "multiSelect") {
            this.toolStateStore.commitMultiSelect();
            this._reset();
            return;
        }

        if (!this._isDragging && this._pendingClick) {
            if (this._pendingClick === "empty") {
                if (toolState.tool === "selection") {
                    this.toolStateStore.resetToIdle();
                }
            } else {
                if (e.shiftKey) {
                    this.toolStateStore.toggleEntityInSelection(this._pendingClick.id, this._pendingClick.type);
                } else {
                    this.toolStateStore.selectEntity(this._pendingClick.id, this._pendingClick.type);
                }
            }
        }

        this._reset();
    };

    onMouseLeave = (_e: React.MouseEvent<SVGSVGElement>): void => {
        if (this.toolStateStore.toolState.tool === "dragPan") {
            this.cameraService.endPan();
        }
        if (this.toolStateStore.hoveredEntity) {
            this.toolStateStore.setHover(null);
        }
        if (this.toolStateStore.toolState.tool === "placement") {
            this.toolStateStore.toolState.previewPos = null;
        }
        this._reset();
    };

    onWheel = (e: WheelEvent): void => {
        e.preventDefault();
        if (!this.svgElement) {
            return;
        }
        const factor = e.deltaY > 0 ? 1.1 : 0.9;
        const svgPos = screenToSvg(this.svgElement, e.clientX, e.clientY);
        this.cameraService.zoom(svgPos, factor);
    };

    // ── Private: декомпозиция onMouseDown ────────────────────────────────────

    private _startPan(e: React.MouseEvent<SVGSVGElement>): void {
        this.cameraService.startPan({ x: e.clientX, y: e.clientY });
    }

    private _commitPlacement(): void {
        const result = this.toolStateStore.commitPlacement();
        if (result && this.entityService) {
            this.entityService.createEntity(result.pos, result.config, result.snap);
        }
    }

    private _recordPendingClick(svgPos: { x: number; y: number }, screenPos: { x: number; y: number }): void {
        this._mouseDownScreen = screenPos;
        this._isDragging = false;
        this._pendingClick = null;

        if (!this.hitTestService || !this.svgElement) {
            return;
        }

        const clientWidth = getSvgClientWidth(this.svgElement);
        const hit = this.hitTestService.hitTest(svgPos, screenPos, this.cameraService.viewBox, clientWidth);

        if (hit.entity && hit.entity.type !== "fixingPoint") {
            this._pendingClick = { id: hit.entity.id, type: hit.entity.type };
        } else {
            this._pendingClick = "empty";
        }
    }

    // ── Private: декомпозиция onMouseMove ────────────────────────────────────

    private _moveDragPan(e: React.MouseEvent<SVGSVGElement>): void {
        const { toolState } = this.toolStateStore;
        if (toolState.tool !== "dragPan" || !this.svgElement) {
            return;
        }

        const panScale = getSvgPanScale(this.svgElement);
        if (!panScale) {
            return;
        }

        const dx = (e.clientX - toolState.startScreenPos.x) * panScale.x;
        const dy = (e.clientY - toolState.startScreenPos.y) * panScale.y;
        this.cameraService.updatePan(dx, dy);
    }

    private _movePlacementPreview(svgPos: { x: number; y: number }): void {
        if (!this.snapService || !this.svgElement) {
            return;
        }
        const { toolState } = this.toolStateStore;
        if (toolState.tool !== "placement") {
            return;
        }
        const snap = this.snapService.calcSnap(svgPos, toolState.entityConfig);
        this.toolStateStore.updatePlacementPreview(svgPos, snap);
    }

    private _updateDragThreshold(e: React.MouseEvent<SVGSVGElement>, svgPos: { x: number; y: number }): void {
        if (!this._mouseDownScreen || this._isDragging) {
            return;
        }

        const dx = e.clientX - this._mouseDownScreen.x;
        const dy = e.clientY - this._mouseDownScreen.y;

        if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
            this._isDragging = true;
            if (this._pendingClick === "empty") {
                this.toolStateStore.startMultiSelect(svgPos);
                this._pendingClick = null;
            }
        }
    }

    private _moveLasso(svgPos: { x: number; y: number }): void {
        const { toolState } = this.toolStateStore;
        if (toolState.tool !== "multiSelect" || !this.hitTestService) {
            return;
        }

        const candidates = this.hitTestService.hitTestRect(toolState.startPos, svgPos);
        const candidateIds = candidates.map((c) => c.id);
        const types = [...new Set(candidates.map((c) => c.type))];
        const candidateType = types.length === 0 ? null : types.length === 1 ? types[0] : "mixed";
        this.toolStateStore.updateMultiSelect(svgPos, candidateIds, candidateType);
    }

    private _updateHover(svgPos: { x: number; y: number }, screenPos: { x: number; y: number }): void {
        if (!this.hitTestService || !this.svgElement) {
            return;
        }

        const clientWidth = getSvgClientWidth(this.svgElement);
        const hit = this.hitTestService.hitTest(svgPos, screenPos, this.cameraService.viewBox, clientWidth);
        const newHoverId = hit.entity?.id ?? null;

        if (newHoverId !== this.toolStateStore.hoveredEntity?.id) {
            this.toolStateStore.setHover(hit.entity ? { id: hit.entity.id, type: hit.entity.type } : null);
        }
    }

    private _toSvg(clientX: number, clientY: number): { x: number; y: number } {
        if (!this.svgElement) {
            return { x: clientX, y: clientY };
        }
        return screenToSvg(this.svgElement, clientX, clientY);
    }

    private _reset(): void {
        this._mouseDownScreen = null;
        this._pendingClick = null;
        this._isDragging = false;
    }

    // ── Клавиатура ───────────────────────────────────────────────────────────

    private handleKeyDown = (e: KeyboardEvent): void => {
        if (e.key === " " && !e.repeat) {
            const target = e.target as HTMLElement;
            const inInteractive =
                target.tagName === "BUTTON" ||
                target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
                target.isContentEditable;
            if (!inInteractive) {
                e.preventDefault();
                this.toolStateStore.setSpaceHeld(true);
            }
        }
        if (e.key === "Escape") {
            this.toolStateStore.resetToIdle();
        }
        if (e.key === "Tab" && !e.repeat) {
            e.preventDefault();
            if (this.toolStateStore.toolState.tool === "placement") {
                this.toolStateStore.cyclePlacementSubtype();
            }
        }
        if ((e.key === "Delete" || e.key === "Backspace") && !e.repeat) {
            const target = e.target as HTMLElement;
            const inInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
            if (!inInput && this.toolStateStore.toolState.tool === "selection" && this.entityService) {
                const ids = this.toolStateStore.selectedIds;
                if (ids.length > 0) {
                    this.entityService.deleteEntities(ids);
                    this.toolStateStore.resetToIdle();
                }
            }
        }
        if (e.ctrlKey && e.key === "z") {
            e.preventDefault();
            e.shiftKey ? this.undoStackStore?.redo() : this.undoStackStore?.undo();
        }
        if (e.ctrlKey && !e.repeat) {
            this.toolStateStore.setCtrlHeld(true);
        }
        if (e.shiftKey && !e.repeat) {
            this.toolStateStore.setShiftHeld(true);
        }
    };

    private handleKeyUp = (e: KeyboardEvent): void => {
        if (e.key === " ") {
            this.toolStateStore.setSpaceHeld(false);
            if (this.toolStateStore.toolState.tool === "dragPan") {
                this.cameraService.endPan();
            }
        }
        if (!e.ctrlKey) {
            this.toolStateStore.setCtrlHeld(false);
        }
        if (!e.shiftKey) {
            this.toolStateStore.setShiftHeld(false);
        }
    };
}
