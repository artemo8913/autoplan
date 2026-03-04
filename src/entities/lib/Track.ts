import type { Pos, RailwayDirection } from "@/shared/types";

import type { Railway } from "./Railway";

const DEFAULT_OFFSET_FROM_RAILWAY_MIDDLE = 50;

interface RailwayTrackConstructorParams {
    railway: Railway;
    direction: RailwayDirection;
    name: string;
    startX: number;
    endX: number;
}

export class Track {
    readonly id: string;
    readonly name: string;
    readonly startX: number;
    readonly endX: number;
    readonly directionMultiplier: -1 | 1;
    private readonly _railway: Railway;
    private readonly _yOffset: number;

    getPositionAtX(x: number): Pos {
        return { x, y: this._railway.getPositionAtX(x).y + this._yOffset };
    }

    constructor(params: RailwayTrackConstructorParams) {
        this.id = crypto.randomUUID();
        this.name = params.name;
        this.startX = params.startX;
        this.endX = params.endX;
        this._railway = params.railway;
        this.directionMultiplier = params.direction === "even" ? 1 : -1;
        this._yOffset = this.directionMultiplier * DEFAULT_OFFSET_FROM_RAILWAY_MIDDLE;
    }
}
