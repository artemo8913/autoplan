import { makeAutoObservable } from "mobx";

import type { AnchorSection } from "@/entities/catenaryPlanGraphic";

export class AnchorSectionsStore {
    anchorSections: Map<string, AnchorSection>;
    
    get list(): AnchorSection[] {
        return [...this.anchorSections.values()];
    }

    add(section: AnchorSection): void {
        this.anchorSections.set(section.id, section);
    }

    remove(id: string): void {
        this.anchorSections.delete(id);
    }

    loadFrom(anchorSections: AnchorSection[]): void {
        this.anchorSections = new Map(anchorSections.map(s => [s.id, s]));
    }

    constructor(anchorSections: AnchorSection[]) {
        this.anchorSections = new Map(anchorSections.map(s => [s.id, s]));
        makeAutoObservable(this);
    }
}
