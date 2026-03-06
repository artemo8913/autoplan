import { makeAutoObservable } from "mobx";

import type { FixingPoint } from "@/entities/lib/FixingPoint";

export class FixingPointsStore {
    fixingPoints: Map<string, FixingPoint>;

    constructor(fixingPoints: FixingPoint[]) {
        this.fixingPoints = new Map(fixingPoints.map(fp => [fp.id, fp]));
        makeAutoObservable(this);
    }

    get list(): FixingPoint[] {
        return [...this.fixingPoints.values()];
    }
}
