import type { Pos } from "@/shared/types";

import type { IPole } from "./IPole";
import type { Track } from "./Track";

export class FixingPoint {
    readonly id: string;
    pole: IPole;
    track?: Track;
    yOffset: number;
    zigzagValue?: number;

    constructor(pole: IPole, track?: Track, yOffset = 0) {
        this.id = crypto.randomUUID();
        this.pole = pole;
        this.track = track;
        this.yOffset = yOffset;
    }

    get startPos(): Pos | null {
        if (!this.track) {
            return null;
        }

        const trackY = this.track.getPositionAtX(this.pole.pos.x).y;
        const dy = trackY - this.pole.pos.y;
        const sign = Math.sign(dy);

        return {
            x: this.pole.pos.x,
            y: this.pole.pos.y + sign * this.pole.radius,
        };
    }

    get endPos(): Pos {
        if (this.track) {
            return this.track.getPositionAtX(this.pole.pos.x);
        }
        return { x: this.pole.pos.x, y: this.pole.pos.y + this.yOffset };
    }
}
