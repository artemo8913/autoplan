import type { CrossSpan, Pole } from "@/shared/types";

interface CrossSpanConstructorParams {
    poleA: Pole;
    poleB: Pole;
}

export class FlexibleCrossSpan implements CrossSpan {
    readonly id: string;
    readonly poleA: Pole;
    readonly poleB: Pole;

    constructor(params: CrossSpanConstructorParams) {
        this.id = crypto.randomUUID();
        this.poleA = params.poleA;
        this.poleB = params.poleB;
    }
}

export class RigidCrossSpan implements CrossSpan {
    readonly id: string;
    readonly poleA: Pole;
    readonly poleB: Pole;

    constructor(params: CrossSpanConstructorParams) {
        this.id = crypto.randomUUID();
        this.poleA = params.poleA;
        this.poleB = params.poleB;
    }
}
