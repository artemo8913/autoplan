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

    /** Сопряжения, ссылающиеся на АУ (одной из сторон). */
    listBySection(sectionId: string): Junction[] {
        return this.list.filter(j => j.section1.id === sectionId || j.section2.id === sectionId);
    }

    add(junction: Junction): void {
        this.junctions.set(junction.id, junction);
    }

    remove(id: string): void {
        this.junctions.delete(id);
    }

    /** Каскад: АУ удалена → её сопряжения не имеют смысла. */
    removeBySection(sectionId: string): void {
        for (const j of this.listBySection(sectionId)) {
            this.junctions.delete(j.id);
        }
    }

    clear(): void {
        this.junctions.clear();
    }

    loadFrom(junctions: Junction[]): void {
        this.junctions = new Map(junctions.map(j => [j.id, j]));
    }

    constructor(junctions: Junction[]) {
        this.junctions = new Map(junctions.map(j => [j.id, j]));
        makeAutoObservable(this);
    }
}
