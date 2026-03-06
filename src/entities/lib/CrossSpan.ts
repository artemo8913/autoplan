import type { CatenaryPole } from "./CatenaryPole";

export interface ICrossSpan {
    readonly id: string;
    readonly poleA: CatenaryPole;
    readonly poleB: CatenaryPole;
}

export class FlexibleCrossSpan implements ICrossSpan {
    readonly id: string;
    readonly poleA: CatenaryPole;
    readonly poleB: CatenaryPole;

    constructor(params: { poleA: CatenaryPole; poleB: CatenaryPole }) {
        this.id = crypto.randomUUID();
        this.poleA = params.poleA;
        this.poleB = params.poleB;
    }
}

export class RigidCrossSpan implements ICrossSpan {
    readonly id: string;
    readonly poleA: CatenaryPole;
    readonly poleB: CatenaryPole;

    constructor(params: { poleA: CatenaryPole; poleB: CatenaryPole }) {
        this.id = crypto.randomUUID();
        this.poleA = params.poleA;
        this.poleB = params.poleB;
    }
}
