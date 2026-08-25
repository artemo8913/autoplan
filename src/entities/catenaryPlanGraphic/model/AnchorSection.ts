import { makeAutoObservable } from "mobx";

import { CatenaryType, type Pole, type Pos } from "@/shared/types/catenaryTypes";
import { ZIGZAG_DRAW_SCALE } from "@/shared/constants";

import type { Track } from "./Track";
import type { FixingPoint } from "./FixingPoint";
import { moveFixingPoint, insertFixingPointAfter, removeFixingPoint } from "../lib/fixingPointListOps";
import { zigzagDrawOffset, type OverlapRange } from "../lib/labelLayout";

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

    /** Заменить весь список ТФ (используется для восстановления в undo) */
    setFixingPoints(fixingPoints: FixingPoint[]): void {
        this.fixingPoints = fixingPoints;
    }

    moveFixingPoint(fpId: string, direction: "up" | "down"): void {
        this.fixingPoints = moveFixingPoint(this.fixingPoints, fpId, direction);
    }

    insertFixingPointAfter(afterFpId: string, fp: FixingPoint): void {
        this.fixingPoints = insertFixingPointAfter(this.fixingPoints, afterFpId, fp);
    }

    removeFixingPoint(fpId: string): void {
        this.fixingPoints = removeFixingPoint(this.fixingPoints, fpId);
    }

    /**
     * Точки провода АУ. Зигзаг рисуется только в зонах сопряжений — у секции их может быть
     * две (по одной на каждый конец), поэтому диапазоны передаются списком.
     */
    getCatenaryPoses(
        zigzagDrawRanges: OverlapRange[] = [],
        zigzagDrawScale: number = ZIGZAG_DRAW_SCALE,
    ): Pos[] {
        return this.fixingPoints.map((fp) => {
            const isStart = fp.pole.id === this.startPole?.id;
            const isEnd = fp.pole.id === this.endPole?.id;

            if (isStart || isEnd) {
                return fp.pole.pos;
            }

            const zigzagOffset = zigzagDrawOffset(fp, zigzagDrawRanges, zigzagDrawScale);

            return { x: fp.endPos.x, y: fp.endPos.y + zigzagOffset };
        });
    }
}
