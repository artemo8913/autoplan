import { action, makeObservable, observable } from "mobx";

import type { Pos } from "@/shared/types/catenaryTypes";

import type { Railway } from "./Railway";

export const TRACK_SCALE_Y = 10; // SVG-единиц на 1 метр смещения

export interface RailwayTrackConstructorParams {
    id?: string;
    railway: Railway;
    name: string;
    startX: number;
    endX: number;
    /** Смещение от оси в метрах. Знак: + чётная сторона, − нечётная. */
    yOffsetMeters: number;
}

export class Track {
    readonly id: string;
    name: string;
    startX: number;
    endX: number;
    yOffsetMeters: number;
    directionMultiplier: -1 | 1;
    private readonly _railway: Railway;

    getPositionAtX(x: number): Pos {
        return { x, y: this._railway.getPositionAtX(x).y + this.yOffsetMeters * TRACK_SCALE_Y };
    }

    setName(name: string): void {
        this.name = name;
    }

    setStartX(x: number): void {
        this.startX = x;
    }

    setEndX(x: number): void {
        this.endX = x;
    }

    setYOffsetMeters(meters: number): void {
        this.yOffsetMeters = meters;
        this.directionMultiplier = meters >= 0 ? 1 : -1;
    }

    constructor(params: RailwayTrackConstructorParams) {
        this.id = params.id ?? crypto.randomUUID();
        this.name = params.name;
        this.startX = params.startX;
        this.endX = params.endX;
        this._railway = params.railway;
        this.yOffsetMeters = params.yOffsetMeters;
        this.directionMultiplier = params.yOffsetMeters >= 0 ? 1 : -1;

        makeObservable(this, {
            name: observable,
            startX: observable,
            endX: observable,
            yOffsetMeters: observable,
            directionMultiplier: observable,
            setName: action,
            setStartX: action,
            setEndX: action,
            setYOffsetMeters: action,
        });
    }
}
