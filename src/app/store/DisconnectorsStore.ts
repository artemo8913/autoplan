import { makeAutoObservable } from "mobx";

import type { Disconnector } from "@/entities/catenaryPlanGraphic";

export class DisconnectorsStore {
    disconnectors: Map<string, Disconnector>;

    get list(): Disconnector[] {
        return [...this.disconnectors.values()];
    }

    add(disconnector: Disconnector): void {
        this.disconnectors.set(disconnector.id, disconnector);
    }

    remove(id: string): void {
        this.disconnectors.delete(id);
    }

    loadFrom(disconnectors: Disconnector[]): void {
        this.disconnectors = new Map(disconnectors.map(d => [d.id, d]));
    }

    constructor(disconnectors: Disconnector[]) {
        this.disconnectors = new Map(disconnectors.map(d => [d.id, d]));
        makeAutoObservable(this);
    }
}
