import type { CrossSpan as ICrossSpan, Pole } from "@/shared/types/catenaryTypes";

interface CrossSpanConstructorParams {
    id?: string;
    spanType: "flexible" | "rigid";
    poleA: Pole;
    poleB: Pole;
}

export class CrossSpan implements ICrossSpan {
    readonly id: string;
    readonly spanType: "flexible" | "rigid";
    readonly poleA: Pole;
    readonly poleB: Pole;

    constructor(params: CrossSpanConstructorParams) {
        this.id = params.id ?? crypto.randomUUID();
        this.spanType = params.spanType;
        this.poleA = params.poleA;
        this.poleB = params.poleB;
    }
}
