import type { Pos } from "./catenaryTypes";

export type EntityType =
    | "catenaryPole"
    | "vlPole"
    | "fixingPoint"
    | "wireLine"
    | "anchorSection"
    | "crossSpan"
    | "disconnector";

export type PlaceableEntityConfig =
    | { kind: "catenaryPole"; material?: "concrete" | "metal" }
    | { kind: "vlPole"; vlType: "intermediate" | "angular" | "terminal" }
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
    /** Знаковое смещение будущей опоры от оси пути, м: «+» вниз по чертежу, «−» вверх */
    offsetMeters: number;
}

// ── GabaritAxisSnap ───────────────────────────────────────────────────────────
/** Ось габарита — то, к чему притянут Y опоры КС при размещении */
export interface GabaritAxisSnap {
    /** Путь, от которого отсчитан габарит (ближайший к курсору) */
    trackId: string;
    /** SVG Y-координата оси (совпадает с snappedPos.y) */
    axisY: number;
    /** SVG Y-координата самого пути — начало отсчёта габарита */
    trackY: number;
    /** Знаковое смещение оси от пути, м; кратно GABARIT_SNAP_STEP_M */
    offsetMeters: number;
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

    /** Найденные пути рядом с курсором, в порядке близости: первый — будущий главный (для опор КС) */
    nearbyTracks?: NearbyTrackSnap[];

    /** Ось габарита, к которой притянут Y опоры: линия вдоль пути на расстоянии gabarit от него */
    gabaritAxis?: GabaritAxisSnap;
}
