import { CatenaryType } from "@/shared/types";
import type { Pos } from "@/shared/types";
import { ZIGZAG_DRAW_SCALE } from "@/shared/constants";

import type { Pole } from "./Pole";
import type { Attachment } from "./Attachment";

interface AnchorSectionConstructorParams {
    type: CatenaryType;
    attachments: Attachment[];
    startPole: Pole;
    endPole: Pole;
}

export class AnchorSection {
    readonly id: string;
    type: CatenaryType = CatenaryType.CS140;
    attachments: Attachment[];
    startPole: Pole;
    endPole: Pole;

    constructor(params: AnchorSectionConstructorParams){
        this.id = crypto.randomUUID();
        this.attachments = params.attachments;
        this.type = params.type;
        this.startPole = params.startPole;
        this.endPole = params.endPole;
    }

    getCatenaryPoses(overlapRange?: { start: number; end: number }): Pos[] {
        return this.attachments.map(att => {
            const isStart = att.pole.id === this.startPole.id;
            const isEnd = att.pole.id === this.endPole.id;

            if (isStart) {
                return { x: att.pole.pos.x + att.pole.radius, y: att.pole.pos.y };
            }
            if (isEnd) {
                return { x: att.pole.pos.x - att.pole.radius, y: att.pole.pos.y };
            }

            const inOverlap = overlapRange
                && att.pole.x >= overlapRange.start
                && att.pole.x <= overlapRange.end;

            const zigzagOffset = inOverlap ? (att.zigzagValue ?? 0) * ZIGZAG_DRAW_SCALE : 0;

            return { x: att.endPos.x, y: att.endPos.y + zigzagOffset };
        });
    }
}
