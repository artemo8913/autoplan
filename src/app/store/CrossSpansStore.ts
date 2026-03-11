import { makeAutoObservable } from "mobx";

import type { FlexibleCrossSpan, RigidCrossSpan } from "@/entities/catenaryPlanGraphic";

export type CrossSpan = FlexibleCrossSpan | RigidCrossSpan;

export class CrossSpansStore {
    crossSpans: Map<string, CrossSpan>;

    get list(): CrossSpan[] {
        return [...this.crossSpans.values()];
    }

    constructor(crossSpans: CrossSpan[]) {
        this.crossSpans = new Map(crossSpans.map(cs => [cs.id, cs]));
        makeAutoObservable(this);
    }
}
