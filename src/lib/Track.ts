import type { Poses, RailwayDirection } from "../types";

const DEFAULT_OFFSET_FROM_RAILWAY_MIDDLE = 50;

interface RailwayTrackConstructorParams {
    railwayMiddlePoses: Poses,
    direction: RailwayDirection,
    name: string,

    startX: number,
    endX: number
}

export class Track {
    private _id: string;
    private _name: string;
    private _startX: number;
    private _endX: number;

    private _offsetsFromRailway: Poses;
    private _globalPoses: Poses;
    
    private _directionMultiplier: -1 | 1; 
    
    private _generateLinearTrack(offset: number){
        for(let i = this._startX; i <= this._endX; i++){
            this._offsetsFromRailway[i] = {x: i, y: offset};
        }
    }

    private _calculateGlobalPoses(railwayPoses: Poses){
        for(let i = this._startX; i <= this._endX; i++){
            this._globalPoses[i] = {
                x: i,
                y: this._offsetsFromRailway[i].y + this._directionMultiplier * railwayPoses[i].y,
            };
        }
    }

    get startX(){
        return this._startX;
    }

    get endX(){
        return this._endX;
    }

    get globalPoses(){
        return this._globalPoses;
    }

    get id(){
        return this._id;
    }

    get name(){
        return this._name;
    }

    get directionMultiplier(){
        return this._directionMultiplier;
    }

    constructor(params: RailwayTrackConstructorParams){
        this._id = crypto.randomUUID();
        this._name = params.name;
        this._startX = params.startX;
        this._endX = params.endX;

        this._offsetsFromRailway = {};
        this._globalPoses = {};

        this._directionMultiplier = params.direction === "even" ? 1 : -1;

        const offset = this._directionMultiplier * DEFAULT_OFFSET_FROM_RAILWAY_MIDDLE;

        this._generateLinearTrack(offset);
        this._calculateGlobalPoses(params.railwayMiddlePoses);
    }
}
