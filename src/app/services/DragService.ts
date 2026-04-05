import type { Pos } from "@/shared/types/catenaryTypes";

import type { CatenaryPoleStore } from "../store/CatenaryPoleStore";
import type { VlPolesStore } from "../store/VlPolesStore";
import type { UndoStackStore } from "../store/UndoStackStore";
import type { ToolStateStore } from "../store/ToolStateStore";

type Position = { x: number; y?: number };

export class DragService {
    constructor(
        private readonly catenaryPoleStore: CatenaryPoleStore,
        private readonly vlPolesStore: VlPolesStore,
        private readonly undoStackStore: UndoStackStore,
        private readonly toolStateStore: ToolStateStore,
    ) {}

    /** Фиксирует начало перетаскивания: сохраняет исходные позиции и переводит в dragEntities. */
    beginDrag(ids: string[], startSvgPos: Pos, anchorId: string): void {
        const origPositions = this._snapshotPositions(ids);
        this.toolStateStore.startDragEntities(startSvgPos, anchorId, origPositions);
    }

    /** Обновляет позиции объектов относительно стартовой точки. При Shift — блокирует ось. */
    moveDrag(svgPos: Pos, shiftKey: boolean): void {
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

        this._applyDelta(toolState.originalPositions, dx, dy);
    }

    /** Фиксирует перетаскивание: записывает в undo-стек и возвращает в idle. */
    endDrag(): void {
        const { toolState } = this.toolStateStore;
        if (toolState.tool !== "dragEntities") {
            return;
        }

        const { originalPositions } = toolState;
        const finalPositions = this._snapshotPositions([...originalPositions.keys()]);

        this.undoStackStore.execute({
            description: `Перемещено объектов: ${originalPositions.size}`,
            execute: () => this._applyPositions(finalPositions),
            undo: () => this._applyPositions(originalPositions),
        });

        this.toolStateStore.resetToIdle();
    }

    /** Отменяет перетаскивание: возвращает объекты на исходные позиции и переходит в idle. */
    abortDrag(): void {
        const { toolState } = this.toolStateStore;
        if (toolState.tool !== "dragEntities") {
            return;
        }

        this._applyPositions(toolState.originalPositions);
        this.toolStateStore.resetToIdle();
    }

    private _snapshotPositions(ids: string[]): Map<string, Position> {
        const positions = new Map<string, Position>();
        for (const id of ids) {
            const cp = this.catenaryPoleStore.poles.get(id);
            if (cp) {
                positions.set(id, { x: cp.x });
                continue;
            }
            const vp = this.vlPolesStore.vlPoles.get(id);
            if (vp) {
                positions.set(id, { x: vp.x, y: vp.y });
            }
        }
        return positions;
    }

    private _applyDelta(originalPositions: Map<string, Position>, dx: number, dy: number): void {
        for (const [id, orig] of originalPositions) {
            const newX = Math.round(orig.x + dx);
            const cp = this.catenaryPoleStore.poles.get(id);
            if (cp) {
                cp.setX(newX);
                continue;
            }
            const vp = this.vlPolesStore.vlPoles.get(id);
            if (vp) {
                vp.x = newX;
                vp.y = (orig.y ?? 0) + dy;
            }
        }
    }

    private _applyPositions(positions: Map<string, Position>): void {
        for (const [id, pos] of positions) {
            const cp = this.catenaryPoleStore.poles.get(id);
            if (cp) {
                cp.setX(pos.x);
                continue;
            }
            const vp = this.vlPolesStore.vlPoles.get(id);
            if (vp) {
                vp.x = pos.x;
                if (pos.y !== undefined) {
                    vp.y = pos.y;
                }
            }
        }
    }
}
