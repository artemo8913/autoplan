import type { Pos, RelativeSidePosition } from "./catenaryTypes";

export type EntityType =
    | "catenaryPole"
    | "vlPole"
    | "supportStructure"
    | "fixingPoint"
    | "wireLine"
    | "anchorSection"
    | "crossSpan"
    | "building"
    | "signal"
    | "platform"
    | "crossing"
    | "insulator"
    | "disconnector";

export type PlaceableEntityConfig =
    | { kind: "catenaryPole"; material?: "concrete" | "metal" }
    | { kind: "vlPole"; vlType: "intermediate" | "angular" | "terminal" }
    | { kind: "building" }
    | { kind: "signal" }
    | { kind: "platform" }
    | { kind: "crossing" }
    | { kind: "spotlight" }
    | { kind: "disconnector"; controlType: "manual" | "remote" | "telecontrol"; phaseCount: 1 | 2 | 3 };

export interface ViewBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

// ── NearbyTrackSnap ───────────────────────────────────────────────────────────
/** Информация об одном из найденных ближайших путей для опоры КС */
export interface NearbyTrackSnap {
    trackId: string;
    /** SVG Y-координата трека — для рендеринга пунктира в превью */
    trackY: number;
    /** Сторона опоры относительно направления пути */
    relativePositionToTrack: RelativeSidePosition;
    /** Габарит до пути, м (всегда >= 0) */
    gabarit: number;
}

// ── SnapInfo ──────────────────────────────────────────────────────────────────
export interface SnapInfo {
    /** К чему произошла привязка */
    snappedTo: "track" | "pole" | "fixingPoint" | "grid" | "none";

    /** Координата привязки (км пк м) */
    km?: number;
    pk?: number;
    m?: number;

    /** Глобальная Y-координата (для опор ВЛ, у которых нет габарита) */
    globalY?: number;

    /** Расстояние привязки в SVG-единицах (чем меньше, тем «сильнее» snap) */
    magnetDistance: number;

    /** Итоговая позиция после snap */
    snappedPos: Pos;

    /** Найденные пути рядом с курсором: ближайший выше и/или ниже (для опор КС) */
    nearbyTracks?: NearbyTrackSnap[];
}
