import { makeAutoObservable } from "mobx";

import type { PlanMeta } from "@/shared/types/planTypes";

export class PlansStore {
    plans: Map<string, PlanMeta> = new Map();

    get list(): PlanMeta[] {
        return [...this.plans.values()].sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );
    }

    add(meta: PlanMeta): void {
        this.plans.set(meta.id, meta);
    }

    remove(id: string): void {
        this.plans.delete(id);
    }

    setJustUpdated(id: string): void {
        const meta = this.plans.get(id);

        if (meta) {
            this.plans.set(id, { ...meta, updatedAt: new Date().toISOString() });
        }
    }

    get(id: string): PlanMeta | undefined {
        return this.plans.get(id);
    }

    constructor() {
        makeAutoObservable(this);
    }
}
