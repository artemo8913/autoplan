import { makeAutoObservable } from "mobx";

import type { WireLine } from "@/entities/catenaryPlanGraphic";

export class WireLinesStore {
    wireLines: Map<string, WireLine>;

    constructor(wireLines: WireLine[]) {
        this.wireLines = new Map(wireLines.map(l => [l.id, l]));
        makeAutoObservable(this);
    }

    get list(): WireLine[] {
        return [...this.wireLines.values()];
    }

    loadFrom(wireLines: WireLine[]): void {
        this.wireLines = new Map(wireLines.map(l => [l.id, l]));
    }
}
