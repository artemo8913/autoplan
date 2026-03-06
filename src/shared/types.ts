// ===== Базовые типы =====
export interface Pos {
    x: number;
    y: number;
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

/**
 * Тип заземления опоры.
 * И — индивидуальное,
 * ИИ — двойное инд.,
 * ИДЗ — инд. диодная защита,
 * ГДЗ — групповая диодная,
 * ТГЗ — тросовое групповое.
 * */
export type GroundingType = "И" | "ИИ" | "ИДЗ" | "ГДЗ" | "ТГЗ";

export type WireType =
    | "feeding_25"   // Питающий 2×25 кВ
    | "reinforcing"  // Усиливающий
    | "screening"    // Экранирующий
    | "return_air"   // Отсасывающая
    | "grounding"    // Групповое заземление
    | "radio_guide"  // ПРС (волновод)
    | "vl"           // ВЛ
    | "volp";        // ВОЛП

export type SupportStructureType =
    | "console"
    | "retainer"
    | "rigid_crossbar"
    | "flexible_crossbar"
    | "bracket";

export enum CatenaryType {
    CS140 = "CS140",
}

export type JunctionType = "non-insulating" | "insulating";