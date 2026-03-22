import { makeAutoObservable } from "mobx";

import type { CatenaryPole } from "@/entities/catenaryPlanGraphic";

//TODO: Переименовать в CatenaryPoleStore (класс и файл)
export class PolesStore {
    poles: Map<string, CatenaryPole>;

    get list(): CatenaryPole[] {
        return [...this.poles.values()];
    }

    loadFrom(poles: CatenaryPole[]): void {
        this.poles = new Map(poles.map((p) => [p.id, p]));
    }

    constructor(poles: CatenaryPole[]) {
        this.poles = new Map(poles.map((p) => [p.id, p]));
        makeAutoObservable(this);
    }
}
