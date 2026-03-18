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

    loadFrom(vlPoles: VlPole[]): void {
        this.vlPoles = new Map(vlPoles.map(p => [p.id, p]));
    }

    /** Alias для совместимости с HitTestService и другими сервисами */
    get poles(): Map<string, VlPole> {
        return this.vlPoles;
    }
}
