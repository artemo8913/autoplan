import { makeAutoObservable } from "mobx";

import type { Pole } from "@/entities/lib/Pole";

export class PolesStore {
    poles: Map<string, Pole>;
    
    get list(): Pole[] {
        return [...this.poles.values()];
    }

    constructor(poles: Pole[]) {
        this.poles = new Map(poles.map(p => [p.id, p]));
        makeAutoObservable(this);
    }
}
