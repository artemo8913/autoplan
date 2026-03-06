import { makeAutoObservable } from "mobx";

import type { WireLine } from "@/entities/lib/WireLine";

export class WireLinesStore {
    wireLines: Map<string, WireLine>;

    constructor(wireLines: WireLine[]) {
        this.wireLines = new Map(wireLines.map(l => [l.id, l]));
        makeAutoObservable(this);
    }

    get list(): WireLine[] {
        return [...this.wireLines.values()];
    }
}
