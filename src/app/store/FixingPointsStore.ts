import { makeAutoObservable } from "mobx";

import type { FixingPoint } from "@/entities/catenaryPlanGraphic";

export class FixingPointsStore {
    fixingPoints: Map<string, FixingPoint>;

    constructor(fixingPoints: FixingPoint[]) {
        this.fixingPoints = new Map(fixingPoints.map(fp => [fp.id, fp]));
        makeAutoObservable(this);
    }

    get list(): FixingPoint[] {
        return [...this.fixingPoints.values()];
    }

    add(fp: FixingPoint): void {
        this.fixingPoints.set(fp.id, fp);
    }

    remove(id: string): void {
        this.fixingPoints.delete(id);
    }

    removeMany(ids: string[]): void {
        for (const id of ids) {
            this.fixingPoints.delete(id);
        }
    }

    loadFrom(fixingPoints: FixingPoint[]): void {
        this.fixingPoints = new Map(fixingPoints.map(fp => [fp.id, fp]));
    }
}
