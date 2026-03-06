import { action, computed, makeObservable, observable } from "mobx";

import { RelativeSidePosition, type AnchorGuyType, type GroundingType } from "@/shared/types";

import type { Track } from "./Track";
import type { IPole } from "./IPole";

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

interface CatenaryPoleConstructorParams {
    x: number;
    name: string;
    tracks: PoleToTracksRelations;
    material?: "concrete" | "metal";
    anchorGuy?: AnchorGuy;
    anchorBrace?: AnchorBrace;
}

const scaleY = 10;

export class CatenaryPole implements IPole {
    readonly id: string;
    x: number;
    name: string;
    radius: number = 20;
    anchorGuy?: AnchorGuy;
    primaryGabarit: number;
    anchorBrace?: AnchorBrace;
    grounding?: GroundingType;
    tracks: PoleToTracksRelations;
    material: "concrete" | "metal";
    isInsulatingJunctionAnchor: boolean = false;

    private _calculateGlobalPosY() {
        for (const trackId in this.tracks) {
            const trackRelation = this.tracks[trackId];
            const pathY = trackRelation.track.getPositionAtX(this.x).y;
            const offset = scaleY * this.primaryGabarit + this.radius;
            const multiplier = trackRelation.relativePositionToTrack * trackRelation.track.directionMultiplier;
            return pathY + offset * multiplier;
        }
    }

    get pos(){
        return {
            x: this.x,
            y: this._calculateGlobalPosY() ?? 0,
        };
    }

    setName(value: string) { this.name = value; }
    setMaterial(value: "concrete" | "metal") { this.material = value; }
    setX(value: number) { this.x = value; }
    setGabarit(value: number) { this.primaryGabarit = value; }
    setAnchorGuy(value: AnchorGuy | undefined) { this.anchorGuy = value; }
    setAnchorBrace(value: AnchorBrace | undefined) { this.anchorBrace = value; }
    setGrounding(value: GroundingType | undefined) { this.grounding = value; }
    setIsInsulatingJunctionAnchor(value: boolean) { this.isInsulatingJunctionAnchor = value; }

    constructor(params: CatenaryPoleConstructorParams) {
        this.id = crypto.randomUUID();
        this.name = params.name;
        this.tracks = params.tracks;
        this.x = params.x;
        this.material = params.material ?? "concrete";
        this.primaryGabarit = Object.values(params.tracks)[0]?.gabarit ?? 3.0;
        this.anchorGuy = params.anchorGuy;
        this.anchorBrace = params.anchorBrace;

        makeObservable(this, {
            name: observable,
            x: observable,
            material: observable,
            primaryGabarit: observable,
            tracks: observable,
            radius: observable,
            anchorGuy: observable,
            anchorBrace: observable,
            grounding: observable,
            isInsulatingJunctionAnchor: observable,
            pos: computed,
            setName: action,
            setMaterial: action,
            setX: action,
            setGabarit: action,
            setAnchorGuy: action,
            setAnchorBrace: action,
            setGrounding: action,
            setIsInsulatingJunctionAnchor: action,
        });
    }
}
