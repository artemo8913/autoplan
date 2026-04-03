import { screenToSvg, svgToScreen, getSvgClientWidth, getSvgPanScale } from "@/shared/svg/svgCoords";

import type { HitTestService } from "./HitTestService";
import type { EntityService } from "./EntityService";
import type { DragService } from "./DragService";
import type { CameraService } from "./CameraService";
import type { PlacementService } from "./PlacementService";
import type { CrossSpanService } from "./CrossSpanService";
import type { SelectionService } from "./SelectionService";
import type { ToolStateStore } from "../store/ToolStateStore";
import type { SelectionStore } from "../store/SelectionStore";
import type { UndoStackStore } from "../store/UndoStackStore";
import type { UIPanelsStore } from "../store/UIPanelsStore";
import type { InlineEditStore } from "../store/InlineEditStore";

export class InputHandlerService {
    private _svgElement: SVGSVGElement | null = null;

    constructor(
        private readonly toolStateStore: ToolStateStore,
        private readonly selectionStore: SelectionStore,
        private readonly cameraService: CameraService,
        private readonly hitTestService: HitTestService,
        private readonly entityService: EntityService,
        private readonly dragService: DragService,
        private readonly undoStackStore: UndoStackStore,
        private readonly uiPanelStore: UIPanelsStore,
        private readonly inlineEditStore: InlineEditStore,
        private readonly placementService: PlacementService,
        private readonly crossSpanService: CrossSpanService,
        private readonly selectionService: SelectionService,
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

        if (e.button === 1 || (e.button === 0 && tool === "panTool")) {
            e.preventDefault();
            this.cameraService.startPan({ x: e.clientX, y: e.clientY });
            return;
        }

        if (e.button !== 0) {
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
            this.dragService.commitDrag(toolState.originalPositions);
            this.toolStateStore.resetToIdle();
            this.selectionService.reset();
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

        const { tool } = this.toolStateStore.toolState;

        if (e.key === "Escape") {
            if (tool === "dragEntities") {
                this.selectionService.onEscape();
                return;
            }
            if (tool === "crossSpan") {
                this.crossSpanService.onEscape();
                return;
            }
            this.selectionStore.clear();
            this.uiPanelStore.closePoleEditorPanel();
        }

        if (e.key === "Delete" && this.selectionStore.hasSelection) {
            const ids = this.selectionStore.selectedIds;
            this.entityService.deleteEntities(ids);
            this.selectionStore.clear();
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
