import { makeAutoObservable } from "mobx";

import type { CatenaryPole } from "@/entities/lib/CatenaryPole";

export class PolesStore {
    poles: Map<string, CatenaryPole>;

    get list(): CatenaryPole[] {
        return [...this.poles.values()];
    }

    constructor(poles: CatenaryPole[]) {
        this.poles = new Map(poles.map(p => [p.id, p]));
        makeAutoObservable(this);
    }
}
