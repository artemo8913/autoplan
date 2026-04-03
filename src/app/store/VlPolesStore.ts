import { makeAutoObservable } from "mobx";

import type { VlPole } from "@/entities/catenaryPlanGraphic";

export class VlPolesStore {
    vlPoles: Map<string, VlPole>;

    constructor(vlPoles: VlPole[]) {
        this.vlPoles = new Map(vlPoles.map(p => [p.id, p]));
        makeAutoObservable(this);
    }

    get list(): VlPole[] {
        return [...this.vlPoles.values()];
    }

    add(pole: VlPole): void {
        this.vlPoles.set(pole.id, pole);
    }

    remove(id: string): void {
        this.vlPoles.delete(id);
    }

    loadFrom(vlPoles: VlPole[]): void {
        this.vlPoles = new Map(vlPoles.map(p => [p.id, p]));
    }
}
