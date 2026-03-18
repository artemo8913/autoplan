import { makeAutoObservable } from "mobx";

import type { PlansStore } from "./PlansStore";

export class AppStore {
    currentView: "planslist" | "canvas" = "planslist";
    currentPlanId: string | null = null;

    constructor(private readonly _plansStore: PlansStore) {
        makeAutoObservable<AppStore, "_plansStore">(this, { _plansStore: false });
    }

    get currentPlanName(): string {
        if (!this.currentPlanId) {
            return "";
        }

        return this._plansStore.get(this.currentPlanId)?.name ?? "";
    }

    setCurrentPlan(id: string): void {
        this.currentPlanId = id;
        this.currentView = "canvas";
    }

    clearCurrentPlan(): void {
        this.currentPlanId = null;
        this.currentView = "planslist";
    }
}
