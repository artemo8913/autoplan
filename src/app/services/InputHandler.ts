import { screenToSvg, getSvgClientWidth, getSvgPanScale } from "@/shared/svg/svgCoords";

import type { CameraService } from "./CameraService";
import type { PlacementToolService } from "./PlacementToolService";
import type { CrossSpanToolService } from "./CrossSpanService";
import type { SelectionToolService } from "./SelectionToolService";
import type { InlineEditService } from "./InlineEditService";
import type { ToolStateStore } from "../store/ToolStateStore";
import type { UndoStackStore } from "../store/UndoStackStore";

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

        const { tool } = this.toolStateStore.toolState;

        const isClickedMainButton = e.button === 0;
        const isClickedMiddleButton = e.button === 1;

        if (isClickedMiddleButton || (isClickedMainButton && tool === "panTool")) {
            e.preventDefault();
            this.cameraService.startPan({ x: e.clientX, y: e.clientY });
            return;
        }

        if (!isClickedMainButton) {
            return;
        }

        e.preventDefault();

        if (tool === "placement") {
            this.placementService.onMouseDown();
            return;
        }

        if (tool === "crossSpan") {
            const svgPos = this._toSvg(e.clientX, e.clientY);
            const svgPerPx = this._getSvgPerPx();
            if (svgPerPx !== null) {
                this.crossSpanService.onMouseDown(svgPos, svgPerPx);
            }
            return;
        }

        if (tool !== "multiSelect") {
            const svgPos = this._toSvg(e.clientX, e.clientY);
            const svgClientWidth = this._svgElement ? getSvgClientWidth(this._svgElement) : 0;
            this.selectionService.onMouseDown(
                svgPos,
                { x: e.clientX, y: e.clientY },
                this.cameraService.viewBox,
                svgClientWidth,
            );
        }
    };

    onMouseMove = (e: React.MouseEvent<SVGSVGElement>): void => {
        const { tool } = this.toolStateStore.toolState;

        if (tool === "dragPan") {
            if (!this._svgElement) {
                return;
            }
            const panScale = getSvgPanScale(this._svgElement);
            if (!panScale) {
                return;
            }
            const ts = this.toolStateStore.toolState;
            if (ts.tool !== "dragPan") {
                return;
            }
            const dx = (e.clientX - ts.startScreenPos.x) * panScale.x;
            const dy = (e.clientY - ts.startScreenPos.y) * panScale.y;
            this.cameraService.updatePan(dx, dy);
            return;
        }

        const svgPos = this._toSvg(e.clientX, e.clientY);

        if (tool === "placement") {
            this.placementService.onMouseMove(svgPos);
            return;
        }

        if (tool === "crossSpan") {
            const svgPerPx = this._getSvgPerPx();
            if (svgPerPx !== null) {
                this.crossSpanService.onMouseMove(svgPos, svgPerPx);
            }
            return;
        }

        if (tool === "dragEntities") {
            this.selectionService.onDragMove(svgPos, e.shiftKey);
            return;
        }

        if (tool === "multiSelect") {
            this.selectionService.onMultiSelectMove(svgPos);
            return;
        }

        this.selectionService.onMouseMove(svgPos, { x: e.clientX, y: e.clientY });
    };

    onMouseUp = (e: React.MouseEvent<SVGSVGElement>): void => {
        const { toolState } = this.toolStateStore;
        const { tool } = toolState;

        if (tool === "dragEntities") {
            this.selectionService.onDragEnd();
            return;
        }

        if (tool === "dragPan") {
            this.cameraService.endPan();
            return;
        }

        const svgPos = this._toSvg(e.clientX, e.clientY);
        this.selectionService.onMouseUp(svgPos, e.shiftKey);
    };

    onMouseLeave = (_e: React.MouseEvent<SVGSVGElement>): void => {
        const { toolState } = this.toolStateStore;

        if (toolState.tool === "dragPan") {
            this.cameraService.endPan();
        }
        if (toolState.tool === "placement") {
            this.placementService.onMouseLeave();
        }

        this.selectionService.onDragLeave();
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
            this.selectionService.onEscape();
            this.toolStateStore.resetToIdle();
        }

        if (e.key === "Delete") {
            this.selectionService.onDelete();
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
