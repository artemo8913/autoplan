import { makeAutoObservable } from "mobx";

import type { FixingSupportType, Pole, Pos } from "@/shared/types/catenaryTypes";

import type { Track } from "./Track";
import type { CrossSpan } from "./CrossSpan";

export type { FixingSupportType };

interface FixingPointConstructorParams {
    id?: string;
    pole: Pole;
    yOffset?: number;
    track?: Track;
    zigzagValue?: number;
    supportType?: FixingSupportType;
    crossSpan?: CrossSpan;
}

export class FixingPoint {
    readonly id: string;
    zigzagValue?: number;
    /** X/identity-якорь. Для ТФ под ригелем = одна из опор поперечины (у них общий X). */
    pole: Pole;
    yOffset: number;
    track?: Track;
    supportType: FixingSupportType;
    crossSpan?: CrossSpan;

    constructor(params: FixingPointConstructorParams) {
        this.id = params.id ?? crypto.randomUUID();
        this.pole = params.pole;
        this.track = params.track;
        this.yOffset = params.yOffset ?? 0;
        this.zigzagValue = params.zigzagValue;
        this.supportType = params.supportType ?? "pole";
        this.crossSpan = params.crossSpan;
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
        switch (this.supportType) {
            case "crossSpan": // подвес на балке: точка на проводе → вырожденная консоль
            case "structure": // задел (тоннель/мост); пока ведёт себя как crossSpan
                return this.endPos;
            case "pole":
            default:
                return this.pole.pos; // опора + консоль
        }
    }

    get poleId() {
        return this.pole.id;
    }

    get endPos(): Pos {
        if (this.track) {
            return this.track.getPositionAtX(this.pole.pos.x);
        }

        return { x: this.pole.pos.x, y: this.pole.pos.y + this.yOffset };
    }

    /** Подпись ТФ для UI: «№5» для опоры, «Ригель»/«Поперечина» для crossSpan. */
    get supportLabel(): string {
        if (this.supportType === "crossSpan") {
            return this.crossSpan?.spanType === "rigid" ? "Ригель" : "Поперечина";
        }
        return `№${this.pole.name}`;
    }
}
