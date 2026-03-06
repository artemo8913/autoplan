import { CatenaryType } from "@/shared/types";
import type { Pos } from "@/shared/types";
import { ZIGZAG_DRAW_SCALE } from "@/shared/constants";

import type { CatenaryPole } from "./CatenaryPole";
import type { FixingPoint } from "./FixingPoint";

interface AnchorSectionConstructorParams {
    type: CatenaryType;
    fixingPoints: FixingPoint[];
    startPole: CatenaryPole;
    endPole: CatenaryPole;
}

export class AnchorSection {
    readonly id: string;
    type: CatenaryType = CatenaryType.CS140;
    fixingPoints: FixingPoint[];
    startPole: CatenaryPole;
    endPole: CatenaryPole;

    constructor(params: AnchorSectionConstructorParams){
        this.id = crypto.randomUUID();
        this.fixingPoints = params.fixingPoints;
        this.type = params.type;
        this.startPole = params.startPole;
        this.endPole = params.endPole;
    }

    getCatenaryPoses(overlapRange?: { start: number; end: number }): Pos[] {
        return this.fixingPoints.map(fp => {
            const isStart = fp.pole.id === this.startPole.id;
            const isEnd = fp.pole.id === this.endPole.id;

            if (isStart) {
                return { x: fp.pole.pos.x + fp.pole.radius, y: fp.pole.pos.y };
            }
            if (isEnd) {
                return { x: fp.pole.pos.x - fp.pole.radius, y: fp.pole.pos.y };
            }

            const inOverlap = overlapRange
                && fp.pole.x >= overlapRange.start
                && fp.pole.x <= overlapRange.end;

            const zigzagOffset = inOverlap ? (fp.zigzagValue ?? 0) * ZIGZAG_DRAW_SCALE : 0;

            return { x: fp.endPos.x, y: fp.endPos.y + zigzagOffset };
        });
    }
}
