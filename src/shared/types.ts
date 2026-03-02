// ===== Базовые типы =====
export interface Pos {
    x: number;
    y: number;
}

export interface Poses {
    [globalMeter: number]: Pos;
}

export type RailwayDirection = "even" | "odd";

export enum RelativeSidePosition {
    LEFT = -1,
    RIGHT = 1,
}

// ===== Типы для будущих этапов =====
export type PoleFoundation = "separate" | "consolidated" | "pile";
export type PoleMaterial = "metal" | "concrete" | "composite";
export type AnchorGuyType = "single" | "double";

export type WireType =
    | "contact"
    | "messenger"
    | "dpr_a"
    | "dpr_b"
    | "feeder_25"
    | "feeder_return"
    | "reinforcing"
    | "protective";

export type SupportStructureType =
    | "console"
    | "retainer"
    | "rigid_crossbar"
    | "flexible_crossbar"
    | "bracket";

export enum CatenaryType {
    CS140 = "CS140",
}