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
    private _svgElement: SVGSVGElement | null = null;

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
            //TODO! обдумать сделать взаимосвязь между toolStateStore и entityService
            const result = this.toolStateStore.commitPlacement();

            if (result) {
                this.entityService?.createEntity(result.pos, result.config, result.snap);
            }

            return;
        }

        if (isClickedMainButton && (tool === "idle" || tool === "selection")) {
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

        this._updateDragThreshold(e, svgPos);

        if (tool === "multiSelect" && this._isDragging) {
            this._moveLasso(svgPos);
            return;
        }
    };

    onMouseUp = (e: React.MouseEvent<SVGSVGElement>): void => {
        const { toolState } = this.toolStateStore;
        const { tool } = toolState;

        if (tool === "dragPan") {
            this.cameraService.endPan();
        } else if (tool === "multiSelect") {
            this.toolStateStore.commitMultiSelect();
        } else if (tool === "selection" && this._pendingClick === "empty" && !this._isDragging) {
            this.toolStateStore.resetToIdle();
        } else if (this._pendingClick && this._pendingClick !== "empty" && !this._isDragging) {
            if (e.shiftKey) {
                this.toolStateStore.toggleEntityInSelection(this._pendingClick.id, this._pendingClick.type);
            } else {
                this.toolStateStore.selectEntity(this._pendingClick.id, this._pendingClick.type);
            }
        }

        this._reset();
        return;
    };

    onMouseLeave = (_e: React.MouseEvent<SVGSVGElement>): void => {
        if (this.toolStateStore.toolState.tool === "dragPan") {
            this.cameraService.endPan();
        }
        if (this.toolStateStore.toolState.tool === "placement") {
            this.toolStateStore.toolState.previewPos = null;
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
        this._isDragging = false;
        this._pendingClick = null;

        if (!this.hitTestService || !this._svgElement) {
            return;
        }

        const clientWidth = getSvgClientWidth(this._svgElement);
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

    private _toSvg(clientX: number, clientY: number): { x: number; y: number } {
        if (!this._svgElement) {
            return { x: clientX, y: clientY };
        }
        return screenToSvg(this._svgElement, clientX, clientY);
    }

    private _reset(): void {
        this._mouseDownScreen = null;
        this._pendingClick = null;
        this._isDragging = false;
    }

    // ── Клавиатура ───────────────────────────────────────────────────────────

    private handleKeyDown = (e: KeyboardEvent): void => {
        const target = e.target as HTMLElement;
        const inInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
        const isSelection = this.toolStateStore.toolState.tool === "selection";

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
            this.toolStateStore.resetToPan();
        }

        if (e.key === "Delete" && isSelection) {
            const ids = this.toolStateStore.selectedIds;

            if (ids.length > 0) {
                this.entityService?.deleteEntities(ids);
                this.toolStateStore.resetToIdle();
            }
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
            this.toolStateStore.setMultiplePlacementFlag(true);
        }
    };

    private handleKeyUp = (e: KeyboardEvent): void => {
        if (!e.ctrlKey) {
            this.toolStateStore.setMultiplePlacementFlag(false);
        }
    };
}
