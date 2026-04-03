import type { PolesStore } from "../store/PolesStore";
import type { VlPolesStore } from "../store/VlPolesStore";
import type { UndoStackStore } from "../store/UndoStackStore";

type Position = { x: number; y?: number };

export class DragService {
    constructor(
        private readonly polesStore: PolesStore,
        private readonly vlPolesStore: VlPolesStore,
        private readonly undoStackStore: UndoStackStore,
    ) {}

    snapshotPositions(ids: string[]): Map<string, Position> {
        const positions = new Map<string, Position>();
        for (const id of ids) {
            const cp = this.polesStore.poles.get(id);
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

    updateDrag(originalPositions: Map<string, Position>, dx: number, dy: number): void {
        for (const [id, orig] of originalPositions) {
            const newX = Math.round(orig.x + dx);

            const cp = this.polesStore.poles.get(id);
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

    commitDrag(originalPositions: Map<string, Position>): void {
        const finalPositions = new Map<string, Position>();
        for (const [id] of originalPositions) {
            const cp = this.polesStore.poles.get(id);
            if (cp) {
                finalPositions.set(id, { x: cp.x });
                continue;
            }
            const vp = this.vlPolesStore.vlPoles.get(id);
            if (vp) {
                finalPositions.set(id, { x: vp.x, y: vp.y });
            }
        }

        this.undoStackStore.execute({
            description: `Перемещено объектов: ${originalPositions.size}`,
            execute: () => this._applyPositions(finalPositions),
            undo: () => this._applyPositions(originalPositions),
        });
    }

    cancelDrag(originalPositions: Map<string, Position>): void {
        this._applyPositions(originalPositions);
    }

    private _applyPositions(positions: Map<string, Position>): void {
        for (const [id, pos] of positions) {
            const cp = this.polesStore.poles.get(id);
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
