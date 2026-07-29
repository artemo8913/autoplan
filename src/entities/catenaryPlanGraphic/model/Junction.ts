import { makeAutoObservable } from "mobx";

import type { AnchorSection } from "./AnchorSection";
import type { JunctionType } from "@/shared/types/catenaryTypes";

interface JunctionConstructorParams {
    id?: string;
    name?: string;
    section1: AnchorSection;
    section2: AnchorSection;
    type: JunctionType;
}

export class Junction {
    readonly id: string;
    readonly section1: AnchorSection;
    readonly section2: AnchorSection;
    name: string;
    type: JunctionType;

    get overlapXRange(): { start: number; end: number } | undefined {
        const s1Start = this.section1.startPole;
        const s1End = this.section1.endPole;
        const s2Start = this.section2.startPole;
        const s2End = this.section2.endPole;

        if (!s1Start || !s1End || !s2Start || !s2End) {
            return undefined;
        }

        return {
            start: Math.max(s1Start.x, s2Start.x),
            end: Math.min(s1End.x, s2End.x),
        };
    }

    get anchorPoleIds(): string[] {
        const ids: string[] = [];

        if (this.section1.endPole) {
            ids.push(this.section1.endPole.id);
        }

        if (this.section2.startPole) {
            ids.push(this.section2.startPole.id);
        }

        return ids;
    }

    setName(name: string): void {
        this.name = name;
    }

    setType(type: JunctionType): void {
        this.type = type;
    }

    constructor(params: JunctionConstructorParams) {
        this.id = params.id ?? crypto.randomUUID();
        this.name = params.name ?? "";
        this.section1 = params.section1;
        this.section2 = params.section2;
        this.type = params.type;
        makeAutoObservable(this, { id: false, section1: false, section2: false });
    }
}
