import { RelativeSidePosition, type AnchorGuyType } from "@/shared/types";

import type { Track } from "./Track";

interface AnchorGuy {
    length?: number;
    type: AnchorGuyType;
    direction: RelativeSidePosition;
}

interface AnchorBrace {
    direction: RelativeSidePosition;
}

interface PoleConstructorParams {
    x: number;
    name: string;
    tracks: PoleToTracksRelations;
    material?: "concrete" | "metal";
    anchorGuy?: AnchorGuy;
    anchorBrace?: AnchorBrace;
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
    private _tracks: PoleToTracksRelations;
    private _defaultDiameter: number = 20;
    private _material: "concrete" | "metal";
    anchorGuy?: AnchorGuy;
    anchorBrace?: AnchorBrace;

    private _calculateGlobalPosY(){
        for(const trackId in this._tracks) {
            const trackRelation = this._tracks[trackId];
            const pathY = trackRelation.track.poses[this._x].y;
            const gabarit = scaleY * trackRelation.gabarit + this._defaultDiameter;
            const multiplier = trackRelation.relativePositionToTrack * trackRelation.track.directionMultiplier;
            
            return pathY + gabarit * multiplier;
        }
    }

    get pos(){
        return {
            x: this._x,
            y: this._calculateGlobalPosY() || 0
        }; 
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

    get tracks() {
        return this._tracks;
    }

    get material() {
        return this._material;
    }

    constructor(params: PoleConstructorParams){
        this._id = crypto.randomUUID();
        this._name = params.name;
        this._tracks = params.tracks;
        this._x = params.x;
        this._material = params.material ?? "concrete";
        this.anchorGuy = params.anchorGuy;
        this.anchorBrace = params.anchorBrace;
    }
}