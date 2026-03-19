import type { EntityType } from "@/shared/types/toolTypes";

import type { HitTestService } from "./HitTestService";
import type { EntityService } from "./EntityService";
import type { SnapService } from "./SnapService";
import type { UIStore } from "../store/UIStore";
import type { UndoStackStore } from "../store/UndoStackStore";

/** Порог в экранных пикселях: меньше — клик, больше — drag */
const DRAG_THRESHOLD = 4;

export class InputHandlerService {
    private svgElement: SVGSVGElement | null = null;

    private _mouseDownScreen: { x: number; y: number } | null = null;
    private _pendingClick: { id: string; type: EntityType } | "empty" | null = null;
    private _isDragging = false;
    private _panScale: { x: number; y: number } | null = null;

    constructor(
        private uiStore: UIStore,
        private hitTestService: HitTestService | null = null,
        private snapService: SnapService | null = null,
        private entityService: EntityService | null = null,
        private undoStackStore: UndoStackStore | null = null,
    ) {}

    setSvgElement(el: SVGSVGElement | null) {
        this.svgElement = el;
    }

    mount() {
        window.addEventListener("keydown", this.handleKeyDown);
        window.addEventListener("keyup", this.handleKeyUp);
    }

    unmount() {
        window.removeEventListener("keydown", this.handleKeyDown);
        window.removeEventListener("keyup", this.handleKeyUp);
    }

    // ── Конвертация координат ─────────────────────────────────────────────

    private screenToSvg(screenX: number, screenY: number): { x: number; y: number } {
        if (!this.svgElement) {
            return { x: screenX, y: screenY };
        }

        const pt = this.svgElement.createSVGPoint();
        pt.x = screenX;
        pt.y = screenY;

        const svgP = pt.matrixTransform(this.svgElement.getScreenCTM()!.inverse());

        return { x: svgP.x, y: svgP.y };
    }

    //TODO: Как будто бы стоит вынести в отдельные сервисы режимы работы (инструменты)
    //Чтобы в сервисе обработчика событий были только условия (на основе нажатых кнопок + выбранных режимов)
    //и сразу вызывался нужные сервис (например, `this.panService.start(args)`).
    //Чтобы inputHandler ничего не знал о типах располагаемых опор, а просто вызывал один сервис для создания,
    //(к примеру (название сервиса до конца не обдумано), `this.placementService("pole", args)))
    //И, возможно, EntityService стоит разбить на более маленькие сервисы. Даже по названию ощущается, что
    //сервис берет на себя слишком много ответственности

    // ── Обработчики мыши ─────────────────────────────────────────────────
    onMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
        // Снять фокус с панельных кнопок/инпутов при взаимодействии с холстом
        (document.activeElement as HTMLElement)?.blur();

        // MMB, Space+LMB или panTool+LMB → pan
        const isPanTool = this.uiStore.toolState.tool === "panTool";

        if (e.button === 1 || (e.button === 0 && (this.uiStore.isSpaceHeld || isPanTool))) {
            e.preventDefault();

            if (this.svgElement) {
                const ctm = this.svgElement.getScreenCTM();

                if (ctm) {
                    this._panScale = { x: 1 / ctm.a, y: 1 / ctm.d };
                }
            }

            this.uiStore.startPan({ x: e.clientX, y: e.clientY });

            return;
        }

        if (e.button !== 0) {
            return;
        }

        e.preventDefault();

        const svgPos = this.screenToSvg(e.clientX, e.clientY);

        const { toolState } = this.uiStore;

        // ── Placement: клик создаёт объект ────────────────────────────────
        if (toolState.tool === "placement") {
            const result = this.uiStore.commitPlacement();

            if (result && this.entityService) {
                const { config, pos, snap } = result;
                this.entityService.createEntity(pos, config, snap);
            }

            return;
        }

        // ── Idle / Selection: hit-test ────────────────────────────────────
        this._mouseDownScreen = { x: e.clientX, y: e.clientY };
        this._isDragging = false;
        this._pendingClick = null;

        if (toolState.tool === "idle" || toolState.tool === "selection") {
            if (!this.hitTestService || !this.svgElement) {
                return;
            }

            const rect = this.svgElement.getBoundingClientRect();
            const hit = this.hitTestService.hitTest(
                svgPos,
                { x: e.clientX, y: e.clientY },
                this.uiStore.viewBox,
                rect.width,
            );

            if (hit.entity && hit.entity.type !== "fixingPoint") {
                this._pendingClick = { id: hit.entity.id, type: hit.entity.type };
            } else {
                this._pendingClick = "empty";
            }
        }
    };

    onMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        const { toolState } = this.uiStore;

        // DragPan
        if (toolState.tool === "dragPan") {
            if (!this._panScale) {
                return;
            }
            const dx = (e.clientX - toolState.startScreenPos.x) * this._panScale.x;
            const dy = (e.clientY - toolState.startScreenPos.y) * this._panScale.y;
            this.uiStore.updatePan(dx, dy);
            return;
        }

        const svgPos = this.screenToSvg(e.clientX, e.clientY);

        // ── Placement: обновить превью + snap ─────────────────────────────
        if (toolState.tool === "placement" && this.snapService && this.svgElement) {
            const snap = this.snapService.calcSnap(svgPos, toolState.entityConfig);
            this.uiStore.updatePlacementPreview(svgPos, snap);
            return;
        }

        // Drag-threshold
        if (this._mouseDownScreen && !this._isDragging) {
            const dx = e.clientX - this._mouseDownScreen.x;
            const dy = e.clientY - this._mouseDownScreen.y;
            if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
                this._isDragging = true;
                if (this._pendingClick === "empty") {
                    this.uiStore.startMultiSelect(svgPos);
                    this._pendingClick = null;
                }
            }
        }

        // Лассо
        if (toolState.tool === "multiSelect" && this._isDragging && this.hitTestService) {
            const currentState = this.uiStore.toolState;
            if (currentState.tool !== "multiSelect") {
                return;
            }
            const candidates = this.hitTestService.hitTestRect(currentState.startPos, svgPos);
            const candidateIds = candidates.map((c) => c.id);
            const types = [...new Set(candidates.map((c) => c.type))];
            const candidateType = types.length === 0 ? null : types.length === 1 ? types[0] : "mixed";
            this.uiStore.updateMultiSelect(svgPos, candidateIds, candidateType);
            return;
        }

        // Hover
        if (!this._isDragging && !this._mouseDownScreen && this.hitTestService && this.svgElement) {
            const rect = this.svgElement.getBoundingClientRect();
            const screenPos = { x: e.clientX, y: e.clientY };
            const hit = this.hitTestService.hitTest(svgPos, screenPos, this.uiStore.viewBox, rect.width);
            const hoverId = hit.entity?.id ?? null;
            const hoverType = hit.entity?.type ?? null;
            if (hoverId !== this.uiStore.hoveredEntityId) {
                this.uiStore.setHover(hoverId, hoverType);
            }
        }
    };

    onMouseUp = (e: React.MouseEvent<SVGSVGElement>) => {
        const { toolState } = this.uiStore;

        if (toolState.tool === "dragPan") {
            this.uiStore.endPan();
            this._reset();
            return;
        }

        if (toolState.tool === "multiSelect") {
            this.uiStore.commitMultiSelect();
            this._reset();
            return;
        }

        if (!this._isDragging && this._pendingClick) {
            if (this._pendingClick === "empty") {
                if (toolState.tool === "selection") {
                    this.uiStore.resetToIdle();
                }
            } else {
                if (e.shiftKey) {
                    this.uiStore.toggleEntityInSelection(this._pendingClick.id, this._pendingClick.type);
                } else {
                    this.uiStore.selectEntity(this._pendingClick.id, this._pendingClick.type);
                }
            }
        }

        this._reset();
    };

    onMouseLeave = (_e: React.MouseEvent<SVGSVGElement>) => {
        if (this.uiStore.toolState.tool === "dragPan") {
            this.uiStore.endPan();
        }
        if (this.uiStore.hoveredEntityId) {
            this.uiStore.setHover(null, null);
        }
        if (this.uiStore.toolState.tool === "placement") {
            this.uiStore.toolState.previewPos = null;
        }
        this._reset();
    };

    onWheel = (e: WheelEvent) => {
        e.preventDefault();
        const factor = e.deltaY > 0 ? 1.1 : 0.9;
        const svgPos = this.screenToSvg(e.clientX, e.clientY);
        this.uiStore.zoom(svgPos, factor);
    };

    private _reset() {
        this._mouseDownScreen = null;
        this._pendingClick = null;
        this._isDragging = false;
        this._panScale = null;
    }

    private handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === " " && !e.repeat) {
            const target = e.target as HTMLElement;
            const inInteractive =
                target.tagName === "BUTTON" ||
                target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
                target.isContentEditable;
            if (!inInteractive) {
                e.preventDefault();
                this.uiStore.setSpaceHeld(true);
            }
        }
        if (e.key === "Escape") {
            this.uiStore.resetToIdle();
        }
        if (e.key === "Tab" && !e.repeat) {
            e.preventDefault();
            if (this.uiStore.toolState.tool === "placement") {
                this.uiStore.cyclePlacementSubtype();
            }
        }
        if ((e.key === "Delete" || e.key === "Backspace") && !e.repeat) {
            const target = e.target as HTMLElement;
            const inInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
            if (!inInput && this.uiStore.toolState.tool === "selection" && this.entityService) {
                const ids = this.uiStore.selectedIds;
                if (ids.length > 0) {
                    this.entityService.deleteEntities(ids);
                    this.uiStore.resetToIdle();
                }
            }
        }
        if (e.ctrlKey && e.key === "z") {
            e.preventDefault();
            e.shiftKey ? this.undoStackStore?.redo() : this.undoStackStore?.undo();
        }
        if (e.ctrlKey && !e.repeat) {
            this.uiStore.setCtrlHeld(true);
        }
        if (e.shiftKey && !e.repeat) {
            this.uiStore.setShiftHeld(true);
        }
    };

    private handleKeyUp = (e: KeyboardEvent) => {
        if (e.key === " ") {
            this.uiStore.setSpaceHeld(false);
            if (this.uiStore.toolState.tool === "dragPan") {
                this.uiStore.endPan();
            }
        }
        if (!e.ctrlKey) {
            this.uiStore.setCtrlHeld(false);
        }
        if (!e.shiftKey) {
            this.uiStore.setShiftHeld(false);
        }
    };
}
