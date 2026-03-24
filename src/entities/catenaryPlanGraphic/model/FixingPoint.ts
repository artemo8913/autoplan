import { makeAutoObservable } from "mobx";

import type { Pole, Pos } from "@/shared/types/catenaryTypes";

import type { Track } from "./Track";

interface FixingPointConstructorParams {
    id?: string;
    pole: Pole;
    yOffset?: number;
    track?: Track;
    zigzagValue?: number;
}

export class FixingPoint {
    readonly id: string;
    zigzagValue?: number;
    pole: Pole;
    yOffset: number;
    track?: Track;

    constructor(params: FixingPointConstructorParams) {
        this.id = params.id ?? crypto.randomUUID();
        this.pole = params.pole;
        this.track = params.track;
        this.yOffset = params.yOffset ?? 0;
        this.zigzagValue = params.zigzagValue;
        makeAutoObservable(this, { id: false });
    }

    setZigzagValue(value: number | undefined): void {
        this.zigzagValue = value;
    }

    setYOffset(value: number): void {
        this.yOffset = value;
    }

    setTrack(track: Track | undefined): void {
        this.track = track;
    }

    get startPos(): Pos {
        const deltaYSign = Math.sign(this.endPos.y - this.pole.pos.y);

        return {
            x: this.pole.pos.x,
            y: this.pole.pos.y + deltaYSign * this.pole.radius,
        };
    }

    get poleId(){
        return this.pole.id;
    }

    get endPos(): Pos {
        if (this.track) {
            return this.track.getPositionAtX(this.pole.pos.x);
        }

        return { x: this.pole.pos.x, y: this.pole.pos.y + this.yOffset };
    }
}
