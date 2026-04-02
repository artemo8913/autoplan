import { makeAutoObservable } from "mobx";

import { CatenaryType, type Pole, type Pos } from "@/shared/types/catenaryTypes";
import { ZIGZAG_DRAW_SCALE } from "@/shared/constants";

import type { FixingPoint } from "./FixingPoint";
import type { Track } from "./Track";

interface AnchorSectionConstructorParams {
    id?: string;
    name?: string;
    type?: CatenaryType;
    fixingPoints?: FixingPoint[];
    startPole?: Pole;
    endPole?: Pole;
    primaryTrack?: Track;
}

export class AnchorSection {
    readonly id: string;
    name: string;
    type: CatenaryType = CatenaryType.CS140;
    fixingPoints: FixingPoint[];
    startPole?: Pole;
    endPole?: Pole;
    primaryTrack?: Track;

    constructor(params: AnchorSectionConstructorParams = {}) {
        this.id = params.id ?? crypto.randomUUID();
        this.name = params.name ?? "";
        this.fixingPoints = params.fixingPoints ?? [];
        this.type = params.type ?? CatenaryType.CS140;
        this.startPole = params.startPole;
        this.endPole = params.endPole;
        this.primaryTrack = params.primaryTrack;
        makeAutoObservable(this, {
            id: false,
            getCatenaryPoses: false,
        });
    }

    setName(name: string): void {
        this.name = name;
    }

    setType(type: CatenaryType): void {
        this.type = type;
    }

    setStartPole(pole: Pole | undefined): void {
        this.startPole = pole;
    }

    setEndPole(pole: Pole | undefined): void {
        this.endPole = pole;
    }

    setPrimaryTrack(track: Track | undefined): void {
        this.primaryTrack = track;
    }

    addFixingPoint(fp: FixingPoint): void {
        this.fixingPoints.push(fp);
    }

    moveFixingPoint(fpId: string, direction: "up" | "down"): void {
        const idx = this.fixingPoints.findIndex((fp) => fp.id === fpId);

        if (idx === -1) {
            return;
        }

        const target = direction === "up" ? idx - 1 : idx + 1;

        if (target < 0 || target >= this.fixingPoints.length) {
            return;
        }

        const arr = [...this.fixingPoints];
        [arr[idx], arr[target]] = [arr[target], arr[idx]];
        this.fixingPoints = arr;
    }

    insertFixingPointAfter(afterFpId: string, fp: FixingPoint): void {
        const idx = this.fixingPoints.findIndex((f) => f.id === afterFpId);
        const arr = [...this.fixingPoints];
        arr.splice(idx + 1, 0, fp);
        this.fixingPoints = arr;
    }

    removeFixingPoint(fpId: string): void {
        this.fixingPoints = this.fixingPoints.filter((fp) => fp.id !== fpId);
    }

    getCatenaryPoses(zigzagDrawRange?: { start: number; end: number }, zigzagDrawScale: number = ZIGZAG_DRAW_SCALE): Pos[] {
        return this.fixingPoints.map((fp) => {
            const isStart = fp.pole.id === this.startPole?.id;
            const isEnd = fp.pole.id === this.endPole?.id;

            if (isStart || isEnd) {
                return fp.pole.pos;
            }

            const inOverlap = zigzagDrawRange && fp.pole.x >= zigzagDrawRange.start && fp.pole.x <= zigzagDrawRange.end;

            if (!inOverlap || !fp.zigzagValue) {
                return { x: fp.endPos.x, y: fp.endPos.y };
            }

            // directionToPole: +1 если опора ниже трека (pole.y > track.y), -1 — выше
            // Положительный зигзаг = дальше от опоры → смещение ПРОТИВ направления к опоре
            const directionToPole = Math.sign(fp.startPos.y - fp.endPos.y) || -1;
            const zigzagOffset = -fp.zigzagValue * zigzagDrawScale * directionToPole;

            return { x: fp.endPos.x, y: fp.endPos.y + zigzagOffset };
        });
    }
}
