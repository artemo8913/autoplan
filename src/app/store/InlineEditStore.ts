import { makeAutoObservable } from "mobx";

export type InlineEditTarget =
    | { kind: "poleName"; poleId: string }
    | { kind: "zigzagValue"; fixingPointId: string }
    | { kind: "spanLength"; leftFpId: string; rightFpId: string; trackId: string };

export interface InlineEditState {
    target: InlineEditTarget;
    /** Позиция относительно canvasContainer (CSS px) */
    screenPos: { x: number; y: number };
    initialValue: string;
}

export class InlineEditStore {
    editing: InlineEditState | null = null;

    constructor() {
        makeAutoObservable(this);
    }

    startEdit(state: InlineEditState): void {
        this.editing = state;
    }

    cancelEdit(): void {
        this.editing = null;
    }

    commitEdit(): void {
        this.editing = null;
    }
}
