import { makeAutoObservable } from "mobx";

import type { AnchorSection } from "@/entities/catenaryPlanGraphic";

export class AnchorSectionsStore {
    anchorSections: Map<string, AnchorSection>;
    
    get list(): AnchorSection[] {
        return [...this.anchorSections.values()];
    }

    constructor(anchorSections: AnchorSection[]) {
        this.anchorSections = new Map(anchorSections.map(s => [s.id, s]));
        makeAutoObservable(this);
    }
}
