import { action, computed, makeObservable, observable } from "mobx";

import { RelativeSidePosition } from "@/shared/types/catenaryTypes";
import type { AnchorGuyType, GroundingType, Pole } from "@/shared/types/catenaryTypes";

import type { Track } from "./Track";

interface AnchorGuy {
    length?: number;
    type: AnchorGuyType;
    direction: RelativeSidePosition;
}

interface AnchorBrace {
    direction: RelativeSidePosition;
}

export interface PoleToTracksRelations {
    [id: string]: {
        track: Track;
        gabarit: number;
        relativePositionToTrack: RelativeSidePosition;
    };
}

interface CatenaryPoleConstructorParams {
    id?: string;
    x: number;
    name: string;
    tracks: PoleToTracksRelations;
    material?: "concrete" | "metal";
    anchorGuy?: AnchorGuy;
    anchorBrace?: AnchorBrace;
}

const scaleY = 10;

export class CatenaryPole implements Pole {
    readonly id: string;
    x: number;
    name: string;
    radius: number = 20;
    anchorGuy?: AnchorGuy;
    anchorBrace?: AnchorBrace;
    grounding?: GroundingType;
    tracks: PoleToTracksRelations;
    material: "concrete" | "metal";
    isInsulatingJunctionAnchor: boolean = false;

    /** Габарит по первому привязанному пути (вычисляется из tracks) */
    get primaryGabarit(): number {
        return Object.values(this.tracks)[0]?.gabarit ?? 0;
    }

    private _calculateGlobalPosY() {
        const firstId = Object.keys(this.tracks)[0];
        if (!firstId) {
            return undefined;
        }
        return this._poleYFromTrack(firstId);
    }

    /** Вычислить Y опоры из привязки к конкретному треку */
    private _poleYFromTrack(trackId: string): number {
        const relation = this.tracks[trackId];
        const trackY = relation.track.getPositionAtX(this.x).y;
        const offset = scaleY * relation.gabarit + this.radius;
        const multiplier = relation.relativePositionToTrack * relation.track.directionMultiplier;
        return trackY + offset * multiplier;
    }

    /**
     * Пересчитать габариты/стороны для всех треков кроме excludeTrackId,
     * исходя из того, что опора находится в poleY.
     */
    private _recalcOtherGabarits(excludeTrackId: string, poleY: number): void {
        for (const trackId in this.tracks) {
            if (trackId === excludeTrackId) {
                continue;
            }
            const relation = this.tracks[trackId];
            const trackY = relation.track.getPositionAtX(this.x).y;
            const absDelta = Math.abs(poleY - trackY);
            const newGabarit = Math.max(0, (absDelta - this.radius) / scaleY);

            const deltaY = trackY - poleY;
            const svgSign = deltaY < 0 ? 1 : -1;
            const newDirection = (svgSign * relation.track.directionMultiplier) as RelativeSidePosition;

            this.tracks[trackId] = {
                ...relation,
                gabarit: Math.round(newGabarit * 10) / 10,
                relativePositionToTrack: newDirection,
            };
        }
    }

    get pos() {
        return {
            x: this.x,
            y: this._calculateGlobalPosY() ?? 0,
        };
    }

    setName(value: string) {
        this.name = value;
    }
    setMaterial(value: "concrete" | "metal") {
        this.material = value;
    }
    setX(value: number) {
        this.x = value;
    }

    /** Установить габарит для первого (primary) привязанного пути */
    setGabarit(value: number) {
        const firstId = Object.keys(this.tracks)[0];
        if (!firstId) {
            return;
        }
        this.tracks[firstId] = { ...this.tracks[firstId], gabarit: value };
        const newPoleY = this._poleYFromTrack(firstId);
        this._recalcOtherGabarits(firstId, newPoleY);
    }

    /** Установить габарит для конкретного пути (с пересчётом остальных) */
    setTrackGabarit(trackId: string, value: number) {
        if (!this.tracks[trackId]) {
            return;
        }
        this.tracks[trackId] = { ...this.tracks[trackId], gabarit: value };
        const newPoleY = this._poleYFromTrack(trackId);
        this._recalcOtherGabarits(trackId, newPoleY);
    }

    /** Изменить сторону опоры относительно пути (с пересчётом остальных) */
    setTrackDirection(trackId: string, direction: RelativeSidePosition) {
        if (!this.tracks[trackId]) {
            return;
        }
        this.tracks[trackId] = { ...this.tracks[trackId], relativePositionToTrack: direction };
        const newPoleY = this._poleYFromTrack(trackId);
        this._recalcOtherGabarits(trackId, newPoleY);
    }

    /** Добавить привязку к пути (габарит и сторона вычисляются из текущей pos) */
    addTrackBinding(track: Track) {
        const poleY = this.pos.y;
        const trackY = track.getPositionAtX(this.x).y;
        const absDelta = Math.abs(poleY - trackY);
        const gabarit = Math.max(0, (absDelta - this.radius) / scaleY);
        const deltaY = trackY - poleY;
        const svgSign = deltaY < 0 ? 1 : -1;
        const direction = (svgSign * track.directionMultiplier) as RelativeSidePosition;

        this.tracks[track.id] = {
            track,
            gabarit: Math.round(gabarit * 10) / 10,
            relativePositionToTrack: direction,
        };
    }

    /** Удалить привязку к пути */
    removeTrackBinding(trackId: string) {
        const { [trackId]: _, ...rest } = this.tracks;
        this.tracks = rest;
    }

    setAnchorGuy(value: AnchorGuy | undefined) {
        this.anchorGuy = value;
    }
    setAnchorBrace(value: AnchorBrace | undefined) {
        this.anchorBrace = value;
    }
    setGrounding(value: GroundingType | undefined) {
        this.grounding = value;
    }
    setIsInsulatingJunctionAnchor(value: boolean) {
        this.isInsulatingJunctionAnchor = value;
    }

    constructor(params: CatenaryPoleConstructorParams) {
        this.id = params.id ?? crypto.randomUUID();
        this.name = params.name;
        this.tracks = params.tracks;
        this.x = params.x;
        this.material = params.material ?? "concrete";
        this.anchorGuy = params.anchorGuy;
        this.anchorBrace = params.anchorBrace;

        makeObservable(this, {
            name: observable,
            x: observable,
            material: observable,
            tracks: observable,
            radius: observable,
            anchorGuy: observable,
            anchorBrace: observable,
            grounding: observable,
            isInsulatingJunctionAnchor: observable,
            primaryGabarit: computed,
            pos: computed,
            setName: action,
            setMaterial: action,
            setX: action,
            setGabarit: action,
            setTrackGabarit: action,
            setTrackDirection: action,
            addTrackBinding: action,
            removeTrackBinding: action,
            setAnchorGuy: action,
            setAnchorBrace: action,
            setGrounding: action,
            setIsInsulatingJunctionAnchor: action,
        });
    }
}
