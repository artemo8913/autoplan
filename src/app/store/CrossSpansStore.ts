import { makeAutoObservable } from "mobx";

import { CrossSpan } from "@/entities/catenaryPlanGraphic";

export class CrossSpansStore {
    crossSpans: Map<string, CrossSpan>;

    get list(): CrossSpan[] {
        return [...this.crossSpans.values()];
    }

    add(crossSpan: CrossSpan): void {
        this.crossSpans.set(crossSpan.id, crossSpan);
    }

    remove(id: string): void {
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
