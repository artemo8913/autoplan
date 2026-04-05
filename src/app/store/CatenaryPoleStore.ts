import { makeAutoObservable } from "mobx";

import type { CatenaryPole } from "@/entities/catenaryPlanGraphic";

export class CatenaryPoleStore {
    poles: Map<string, CatenaryPole>;

    get list(): CatenaryPole[] {
        return [...this.poles.values()];
    }

    add(pole: CatenaryPole): void {
        this.poles.set(pole.id, pole);
    }

    remove(id: string): void {
        this.poles.delete(id);
    }

    loadFrom(poles: CatenaryPole[]): void {
        this.poles = new Map(poles.map((p) => [p.id, p]));
    }

    constructor(poles: CatenaryPole[]) {
        this.poles = new Map(poles.map((p) => [p.id, p]));
        makeAutoObservable(this);
    }
}
