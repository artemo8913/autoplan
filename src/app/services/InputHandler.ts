import { screenToSvg, getSvgClientWidth, getSvgPanScale } from "@/shared/svg/svgCoords";

import type { CameraService } from "./CameraService";
import type { PlacementToolService } from "./PlacementToolService";
import type { CrossSpanToolService } from "./CrossSpanToolService";
import type { SelectionToolService } from "./SelectionToolService";
import type { InlineEditService } from "./InlineEditService";
import type { ToolStateStore } from "../store/ToolStateStore";
import type { UndoStackStore } from "../store/UndoStackStore";
import type { DragService } from "./DragService";
import type { EntityService } from "./EntityService";

export class InputHandlerService {
    private _svgElement: SVGSVGElement | null = null;

    constructor(
        private readonly toolStateStore: ToolStateStore,
        private readonly cameraService: CameraService,
        private readonly undoStackStore: UndoStackStore,
        private readonly inlineEditService: InlineEditService,
        private readonly placementService: PlacementToolService,
        private readonly crossSpanService: CrossSpanToolService,
        private readonly selectionService: SelectionToolService,
        private readonly entityService: EntityService,
        private readonly dragService: DragService,
    ) {}

    private get _toolState() {
        return this.toolStateStore.toolState;
    }

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
        e.preventDefault();

        const { tool } = this.toolStateStore.toolState;

        const isClickedMainButton = e.button === 0;
        const isClickedMiddleButton = e.button === 1;

        const svgPos = this._toSvg(e.clientX, e.clientY);
        const svgPerPx = this._getSvgPerPx();
        const svgClientWidth = this._svgElement ? getSvgClientWidth(this._svgElement) : 0;

        if (isClickedMiddleButton || (isClickedMainButton && tool === "panTool")) {
            this.cameraService.startPan({ x: e.clientX, y: e.clientY });
            return;
        }

        if (!isClickedMainButton) {
            return;
        }

        switch (this._toolState.tool) {
            case "placement": {
                this.placementService.createEntity();
                break;
            }
            case "crossSpan": {
                if (!svgPerPx) {
                    return;
                }
                this.crossSpanService.pickPole(svgPos, svgPerPx);
                break;
            }
            case "idle": {
                this.selectionService.beginGesture(
                    svgPos,
                    { x: e.clientX, y: e.clientY },
                    this.cameraService.viewBox,
                    svgClientWidth,
                );
                break;
            }
            default: {
                break;
            }
        }
    };

    onMouseMove = (e: React.MouseEvent<SVGSVGElement>): void => {
        const svgPos = this._toSvg(e.clientX, e.clientY);

        switch (this._toolState.tool) {
            case "dragPan": {
                if (!this._svgElement) {
                    return;
                }
                const panScale = getSvgPanScale(this._svgElement);
                if (!panScale) {
                    return;
                }
                const dx = (e.clientX - this._toolState.startScreenPos.x) * panScale.x;
                const dy = (e.clientY - this._toolState.startScreenPos.y) * panScale.y;
                this.cameraService.updatePan(dx, dy);
                break;
            }
            case "placement": {
                this.placementService.updatePreview(svgPos);
                break;
            }
            case "crossSpan": {
                const svgPerPx = this._getSvgPerPx();
                if (!svgPerPx) {
                    return;
                }
                this.crossSpanService.updatePreview(svgPos, svgPerPx);
                break;
            }
            case "multiSelect": {
                this.selectionService.updateMultiSelect(svgPos);
                break;
            }
            case "dragEntities": {
                this.dragService.moveDrag(svgPos, e.shiftKey);
                break;
            }
            default: {
                const dragIntent = this.selectionService.updateGesture(svgPos, { x: e.clientX, y: e.clientY });
                if (dragIntent) {
                    this.dragService.beginDrag(
                        this.selectionService.getSelected(),
                        dragIntent.startSvgPos,
                        dragIntent.anchorId,
                    );
                }
                break;
            }
        }
    };

    onMouseUp = (e: React.MouseEvent<SVGSVGElement>): void => {
        switch (this._toolState.tool) {
            case "dragPan": {
                this.cameraService.endPan();
                break;
            }
            case "dragEntities": {
                this.dragService.endDrag();
                this.selectionService.resetGesture();
                break;
            }
            default: {
                const svgPos = this._toSvg(e.clientX, e.clientY);
                this.selectionService.endGesture(svgPos, e.shiftKey);
                break;
            }
        }
    };

    onMouseLeave = (_e: React.MouseEvent<SVGSVGElement>): void => {
        switch (this._toolState.tool) {
            case "dragPan": {
                this.cameraService.endPan();
                break;
            }
            case "placement": {
                this.placementService.reset();
                break;
            }
            case "dragEntities": {
                this.dragService.abortDrag();
                this.selectionService.resetGesture();
                break;
            }
            case "multiSelect": {
                this.toolStateStore.resetToIdle();
                break;
            }
            default: {
                break;
            }
        }
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

    onDoubleClick = (e: React.MouseEvent<SVGSVGElement>): void => {
        if (!this._svgElement) {
            return;
        }
        this.inlineEditService.tryStartEdit(this._svgElement, e.clientX, e.clientY);
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
            if (this._toolState.tool === "idle") {
                this.selectionService.clearSelection();
            } else if (this._toolState.tool === "dragEntities") {
                this.dragService.abortDrag();
            } else {
                this.toolStateStore.resetToIdle();
            }
        }

        if (e.key === "Delete") {
            const ids = this.selectionService.getSelected();
            this.entityService.deleteEntities(ids);
            this.selectionService.clearSelection();
        }

        if (e.ctrlKey && e.key === "z") {
            e.preventDefault();
            this.undoStackStore.undo();
        }

        if (e.ctrlKey && e.key === "y") {
            e.preventDefault();
            this.undoStackStore.redo();
        }

        if (e.ctrlKey) {
            this.placementService.setRepeating(true);
        }
    };

    private handleKeyUp = (e: KeyboardEvent): void => {
        if (!e.ctrlKey) {
            this.placementService.setRepeating(false);
        }
    };

    // ── Хелперы ──────────────────────────────────────────────────────────────

    private _toSvg(clientX: number, clientY: number): { x: number; y: number } {
        if (!this._svgElement) {
            return { x: clientX, y: clientY };
        }
        return screenToSvg(this._svgElement, clientX, clientY);
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
}
