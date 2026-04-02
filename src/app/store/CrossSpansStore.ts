import { makeAutoObservable } from "mobx";

import type { FlexibleCrossSpan, RigidCrossSpan } from "@/entities/catenaryPlanGraphic";

export type CrossSpan = FlexibleCrossSpan | RigidCrossSpan;

export class CrossSpansStore {
    crossSpans: Map<string, CrossSpan>;

    get list(): CrossSpan[] {
        return [...this.crossSpans.values()];
    }

    add(crossSpan: CrossSpan): void {
        this.crossSpans.set(crossSpan.id, crossSpan);
    }

    delete(id: string): void {
        this.crossSpans.delete(id);
    }

    loadFrom(crossSpans: CrossSpan[]): void {
        this.crossSpans = new Map(crossSpans.map(cs => [cs.id, cs]));
    }

    constructor(crossSpans: CrossSpan[]) {
        this.crossSpans = new Map(crossSpans.map(cs => [cs.id, cs]));
        makeAutoObservable(this);
    }
}
