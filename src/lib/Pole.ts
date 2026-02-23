import { RelativeSidePosition, type Pos } from "../types";
import type { Track } from "./Track";

interface PoleConstructorParams {
    x: number;
    name: string;
    tracks: PoleToTracksRelations;
}

interface PoleToTracksRelations {
    [id: string]: {
        track: Track;
        gabarit: number;
        relativePositionToTrack: RelativeSidePosition
    }
}

const scaleY = 10;

export class Pole {
    private _x: number;
    private _id: string;
    private _name: string;
    private _globalPos: Pos;
    private _tracks: PoleToTracksRelations;
    private _defaultDiameter: number = 20;

    private _calculateGlobalPosY(){
        for(const trackId in this._tracks) {
            const trackRelation = this._tracks[trackId];
            const pathY = trackRelation.track.globalPoses[this._x].y;
            const gabarit = scaleY * trackRelation.gabarit + this._defaultDiameter;
            const multiplier = trackRelation.relativePositionToTrack * trackRelation.track.directionMultiplier;
            
            return pathY + gabarit * multiplier;
        }
    }

    get globalPos(){
        return this._globalPos; 
    }

    get id(){
        return this._id;
    }

    get name(){
        return this._name;
    }

    get diameter(){
        return this._defaultDiameter;
    }

    constructor(params: PoleConstructorParams){
        this._id = crypto.randomUUID();
        this._name = params.name;
        this._tracks = params.tracks;
        this._x = params.x;

        this._globalPos = {
            x: params.x,
            y: this._calculateGlobalPosY() || 0
        };
    }
}