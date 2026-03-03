import { makeObservable, observable, computed, action } from "mobx";

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

interface PoleToTracksRelations {
    [id: string]: {
        track: Track;
        gabarit: number;
        relativePositionToTrack: RelativeSidePosition;
    }
}

interface PoleConstructorParams {
    x: number;
    name: string;
    tracks: PoleToTracksRelations;
    material?: "concrete" | "metal";
    anchorGuy?: AnchorGuy;
    anchorBrace?: AnchorBrace;
}

const scaleY = 10;

export class Pole {
    private _x: number;
    private _id: string;
    private _name: string;
    private _primaryGabarit: number;
    private _tracks: PoleToTracksRelations;
    private _defaultDiameter: number = 20;
    private _material: "concrete" | "metal";
    anchorGuy?: AnchorGuy;
    anchorBrace?: AnchorBrace;

    private _calculateGlobalPosY() {
        for (const trackId in this._tracks) {
            const trackRelation = this._tracks[trackId];
            const pathY = trackRelation.track.getPositionAtX(this._x).y;
            const offset = scaleY * this._primaryGabarit + this._defaultDiameter;
            const multiplier = trackRelation.relativePositionToTrack * trackRelation.track.directionMultiplier;
            return pathY + offset * multiplier;
        }
    }

    get pos(){
        return {
            x: this._x,
            y: this._calculateGlobalPosY() ?? 0,
        };
    }

    get id() { return this._id; }
    get name() { return this._name; }
    get material() { return this._material; }
    get diameter() { return this._defaultDiameter; }
    get tracks() { return this._tracks; }
    get x() { return this._x; }
    get gabarit() { return this._primaryGabarit; }

    setName(value: string) { this._name = value; }
    setMaterial(value: "concrete" | "metal") { this._material = value; }
    setX(value: number) { this._x = value; }
    setGabarit(value: number) { this._primaryGabarit = value; }
    setAnchorGuy(value: AnchorGuy | undefined) { this.anchorGuy = value; }
    setAnchorBrace(value: AnchorBrace | undefined) { this.anchorBrace = value; }

    constructor(params: PoleConstructorParams) {
        this._id = crypto.randomUUID();
        this._name = params.name;
        this._tracks = params.tracks;
        this._x = params.x;
        this._material = params.material ?? "concrete";
        this._primaryGabarit = Object.values(params.tracks)[0]?.gabarit ?? 3.0;
        this.anchorGuy = params.anchorGuy;
        this.anchorBrace = params.anchorBrace;

        makeObservable<Pole, "_x" | "_name" | "_material" | "_gabarit">(this, {
            _x: observable,
            _name: observable,
            _material: observable,
            _gabarit: observable,
            anchorGuy: observable,
            anchorBrace: observable,
            pos: computed,
            name: computed,
            material: computed,
            x: computed,
            gabarit: computed,
            setName: action,
            setMaterial: action,
            setX: action,
            setGabarit: action,
            setAnchorGuy: action,
            setAnchorBrace: action,
        });
    }
}
