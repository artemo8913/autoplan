import type { AnchorGuyType, CatenaryType, JunctionType, RelativeSidePosition, VlPoleType, WireType } from "./catenaryTypes";

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
    gabarit: number;
    relativePositionToTrack: RelativeSidePosition;
}

export interface CatenaryPoleDTO {
    id: string;
    x: number;
    name: string;
    radius: number;
    material: "concrete" | "metal";
    isInsulatingJunctionAnchor: boolean;
    grounding?: string;
    anchorGuy?: { type: AnchorGuyType; direction: RelativeSidePosition; length?: number };
    anchorBrace?: { direction: RelativeSidePosition };
    trackBindings: TrackBindingDTO[];
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
}

export interface AnchorSectionDTO {
    id: string;
    type: CatenaryType;
    startPoleId: string;
    endPoleId: string;
    fixingPointIds: string[];
}

export interface JunctionDTO {
    id: string;
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

export interface PlanDTO extends PlanMeta {
    railway: RailwayDTO;
    tracks: TrackDTO[];
    catenaryPoles: CatenaryPoleDTO[];
    vlPoles: VlPoleDTO[];
    fixingPoints: FixingPointDTO[];
    anchorSections: AnchorSectionDTO[];
    junctions: JunctionDTO[];
    wireLines: WireLineDTO[];
}
