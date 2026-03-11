import { makeAutoObservable } from "mobx";

import type { Junction } from "@/entities/catenaryPlanGraphic";

export class JunctionsStore {
    junctions: Map<string, Junction>;

    get list(): Junction[] {
        return [...this.junctions.values()];
    }

    get insulatingJunctionAnchorPoleIds(): Set<string> {
        const ids = new Set<string>();

        for (const j of this.junctions.values()) {
            if (j.type === "insulating") {
                j.anchorPoleIds.forEach(id => ids.add(id));
            }
        }

        return ids;
    }

    constructor(junctions: Junction[]) {
        this.junctions = new Map(junctions.map(j => [j.id, j]));
        makeAutoObservable(this);
    }
}
