import type { PoleRelativePositionToTrack, Pos } from "../types";
import type { Track } from "./Track";

interface PoleConstructorParams {
    x: number;
    name: string;
    tracks: PoleTracksAttachments;
}

interface PoleTracksAttachments {
    [id: string]: {
        track: Track;
        gabarit: number;
        relativePositionToTrack: PoleRelativePositionToTrack
    }
}

const scaleY = 10;

const POLE_BASIC_RADIUS = 20;

export class Pole {
    private _x: number;
    private _id: string;
    private _name: string;
    private _globalPos: Pos;
    private _tracks: PoleTracksAttachments;

    private _relativePositionMultiplier(relativePosition: PoleRelativePositionToTrack): -1 | 1{
        return relativePosition === "left" ? -1 : 1;
    }

    private _calculateGlobalPosY(){
        for(const trackId in this._tracks) {
            const attachment = this._tracks[trackId];
            const pathY = attachment.track.globalPoses[this._x].y;
            const gabarit = scaleY * attachment.gabarit + POLE_BASIC_RADIUS;
            const multiplier = this._relativePositionMultiplier(attachment.relativePositionToTrack)
                               * attachment.track.directionMultiplier;
            
            return pathY + gabarit * multiplier;
        }
    }

    get globalPos(){
        return  this._globalPos; 
    }

    get id(){
        return this._id;
    }

    get name(){
        return this._name;
    }

    constructor(params: PoleConstructorParams){
        this._id = params.name + new Date().toString();
        this._name = params.name;
        this._tracks = params.tracks;
        this._x = params.x;

        this._globalPos = {
            x: params.x,
            y: this._calculateGlobalPosY() || 0
        };
    }
}