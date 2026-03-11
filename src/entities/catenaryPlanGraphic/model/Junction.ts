import type { AnchorSection } from "./AnchorSection";
import type { JunctionType } from "@/shared/types/catenaryTypes";

interface JunctionConstructorParams {
    section1: AnchorSection;
    section2: AnchorSection;
    type: JunctionType;
}

export class Junction {
    readonly id: string;
    readonly section1: AnchorSection;
    readonly section2: AnchorSection;
    readonly type: JunctionType;
    
    get overlapXRange(): { start: number; end: number } {
        return {
            start: Math.max(this.section1.startPole.x, this.section2.startPole.x),
            end: Math.min(this.section1.endPole.x, this.section2.endPole.x),
        };
    }
    
    get anchorPoleIds(): string[] {
        return [this.section1.endPole.id, this.section2.startPole.id];
    }
    
    constructor(params: JunctionConstructorParams) {
        this.id = crypto.randomUUID();
        this.section1 = params.section1;
        this.section2 = params.section2;
        this.type = params.type;
    }
}
