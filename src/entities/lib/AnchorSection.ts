import {CatenaryType, type Pole, type Pos } from "@/shared/types";
import { ZIGZAG_DRAW_SCALE } from "@/shared/constants";

import type { FixingPoint } from "./FixingPoint";

interface AnchorSectionConstructorParams {
    type: CatenaryType;
    fixingPoints: FixingPoint[];
    startPole: Pole;
    endPole: Pole;
}

export class AnchorSection {
    readonly id: string;
    type: CatenaryType = CatenaryType.CS140;
    fixingPoints: FixingPoint[];
    startPole: Pole;
    endPole: Pole;

    constructor(params: AnchorSectionConstructorParams){
        this.id = crypto.randomUUID();
        this.fixingPoints = params.fixingPoints;
        this.type = params.type;
        this.startPole = params.startPole;
        this.endPole = params.endPole;
    }

    getCatenaryPoses(zigzagDrawRange?: { start: number; end: number }): Pos[] {
        return this.fixingPoints.map(fp => {
            const isStart = fp.pole.id === this.startPole.id;
            const isEnd = fp.pole.id === this.endPole.id;

            if (isStart) {
                return { x: fp.pole.pos.x + fp.pole.radius, y: fp.pole.pos.y };
            }
            if (isEnd) {
                return { x: fp.pole.pos.x - fp.pole.radius, y: fp.pole.pos.y };
            }

            const inOverlap = zigzagDrawRange
                && fp.pole.x >= zigzagDrawRange.start
                && fp.pole.x <= zigzagDrawRange.end;

            const zigzagOffset = inOverlap ? (fp.zigzagValue ?? 0) * ZIGZAG_DRAW_SCALE : 0;

            return { x: fp.endPos.x, y: fp.endPos.y + zigzagOffset };
        });
    }
}
