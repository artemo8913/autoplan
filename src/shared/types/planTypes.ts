import type { AnchorGuyType, CatenaryType, DisconnectorControlType, DisconnectorState, FixingSupportType, JunctionType, Picketage, PoleMaterial, RelativeSidePosition, VlPoleType, WireType } from "./catenaryTypes";

export interface PlanMeta {
    id: string;
    name: string;
    createdAt: string;   // ISO 8601
    updatedAt: string;
}

export interface RailwayDTO {
    name: string;
    startX: number;
    endX: number;
    /** Нестандартные (рубленые) км. Опускается для стандартных участков. */
    picketage?: Picketage;
}

export interface TrackDTO {
    id: string;
    name: string;
    startX: number;
    endX: number;
    yOffsetMeters: number;
}

export interface TrackBindingDTO {
    trackId: string;
    /**
     * Знаковое смещение опоры от оси пути, м: «+» вниз по чертежу, «−» вверх
     * (та же ось, что у TrackDTO.yOffsetMeters). Габарит = |offsetMeters|,
     * сторона по ходу движения выводится из знака и направления пути.
     * До версии формата 2 здесь была пара gabarit + relativePositionToTrack.
     */
    offsetMeters: number;
}

export interface CatenaryPoleDTO {
    id: string;
    x: number;
    name: string;
    radius: number;
    material: PoleMaterial;
    isInsulatingJunctionAnchor: boolean;
    grounding?: string;
    anchorGuy?: { type: AnchorGuyType; direction: RelativeSidePosition };
    anchorBrace?: { direction: RelativeSidePosition };
    trackBindings: TrackBindingDTO[];
    /** Главный путь опоры. Опускается, когда главный — первый в trackBindings. */
    primaryTrackId?: string;
}

export interface VlPoleDTO {
    id: string;
    x: number;
    y: number;
    name: string;
    vlType: VlPoleType;
}

export interface FixingPointDTO {
    id: string;
    poleId: string;
    trackId?: string;
    yOffset: number;
    zigzagValue?: number;
    /** Опускается для опорного подвеса (по умолчанию "pole"). */
    supportType?: FixingSupportType;
    /** Поперечина/ригель, к которой подвешена ТФ (для supportType === "crossSpan"). */
    crossSpanId?: string;
}

export interface AnchorSectionDTO {
    id: string;
    name?: string;
    type: CatenaryType;
    startPoleId?: string;
    endPoleId?: string;
    fixingPointIds: string[];
    primaryTrackId?: string;
}

export interface JunctionDTO {
    id: string;
    name?: string;
    type: JunctionType;
    section1Id: string;
    section2Id: string;
}

export interface WireLineDTO {
    id: string;
    wireType: WireType;
    label?: string;
    fixingPointIds: string[];
}

export interface DisconnectorDTO {
    id: string;
    name: string;
    poleId: string;
    wireLineId?: string;
    controlType: DisconnectorControlType;
    state: DisconnectorState;
    phaseCount: 1 | 2 | 3;
    yOffset: number;
}

export interface CrossSpanDTO {
    id: string;
    type: "flexible" | "rigid";
    poleAId: string;
    poleBId: string;
}

export interface PlanDTO extends PlanMeta {
    /**
     * Версия формата сериализации (см. CURRENT_PLAN_VERSION в planMigrations.ts).
     * Планы, сохранённые до её введения, читаются как версия 0 и мигрируются при загрузке.
     */
    version: number;
    railway: RailwayDTO;
    tracks: TrackDTO[];
    catenaryPoles: CatenaryPoleDTO[];
    vlPoles: VlPoleDTO[];
    fixingPoints: FixingPointDTO[];
    anchorSections: AnchorSectionDTO[];
    junctions: JunctionDTO[];
    wireLines: WireLineDTO[];
    crossSpans?: CrossSpanDTO[];
    disconnectors?: DisconnectorDTO[];
}
