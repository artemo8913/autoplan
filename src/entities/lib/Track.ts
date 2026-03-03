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
    private readonly _id: string;
    private readonly _name: string;
    private readonly _startX: number;
    private readonly _endX: number;
    private readonly _railway: Railway;
    private readonly _yOffset: number;
    private readonly _directionMultiplier: -1 | 1;

    get id() { return this._id; }
    get name() { return this._name; }
    get startX() { return this._startX; }
    get endX() { return this._endX; }
    get directionMultiplier() { return this._directionMultiplier; }

    getPositionAtX(x: number): Pos {
        return { x, y: this._railway.getPositionAtX(x).y + this._yOffset };
    }

    constructor(params: RailwayTrackConstructorParams) {
        this._id = crypto.randomUUID();
        this._name = params.name;
        this._startX = params.startX;
        this._endX = params.endX;
        this._railway = params.railway;
        this._directionMultiplier = params.direction === "even" ? 1 : -1;
        this._yOffset = this._directionMultiplier * DEFAULT_OFFSET_FROM_RAILWAY_MIDDLE;
    }
}
