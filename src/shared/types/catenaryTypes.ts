export interface Pos {
    x: number;
    y: number;
}

/**
 * Нестандартный (рубленый) километр участка.
 * Описывается полностью одним списком пикетов: оба явления — «не 10 ПК» и «пикет ≠ 100 м» —
 * следствия этого списка. Хранится экономно: только число пикетов и отклонения длин.
 */
export interface NonStandardKm {
    /** Номер километра (целый, в пределах участка). */
    km: number;
    /** Число пикетов в км (стандарт — 10). ≠ 10 → рубленый по количеству. */
    picketCount: number;
    /** Индекс ПК (0-based) → длина в метрах. Хранятся ТОЛЬКО отклонения от 100 м. */
    picketOverrides?: Record<number, number>;
}

/**
 * Пикетаж участка — список только нестандартных км.
 * Пусто = всё стандартное (10 ПК по 100 м), перевод км/пк/м ↔ метры линейный.
 */
export type Picketage = NonStandardKm[];

export enum RelativeSidePosition {
    LEFT = -1,
    RIGHT = 1,
}

export type PoleMaterial = "metal" | "concrete" | "composite";
export type AnchorGuyType = "single" | "double";
export type VlPoleType = "intermediate" | "angular" | "terminal";

export interface Pole {
    readonly id: string;
    x: number;
    name: string;
    radius: number;
    readonly pos: Pos;
}

export interface CrossSpan {
    readonly id: string;
    readonly poleA: Pole;
    readonly poleB: Pole;
}

/**
 * Тип несущей конструкции, к которой подвешена контактная подвеска в точке фиксации:
 * - pole      — опора + консоль (рисуется консоль от опоры к проводу);
 * - crossSpan — поперечина/ригель (провод висит на балке, консоль не рисуется);
 * - structure — искусственное сооружение (тоннель/мост); задел, пока ведёт себя как crossSpan.
 */
export type FixingSupportType = "pole" | "crossSpan" | "structure";

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
    | "feeding_25" // Питающий 2×25 кВ
    | "reinforcing" // Усиливающий
    | "screening" // Экранирующий
    | "return_air" // Отсасывающая
    | "grounding" // Групповое заземление
    | "radio_guide" // ПРС (волновод)
    | "vl" // ВЛ
    | "volp"; // ВОЛП

export enum CatenaryType {
    CS120 = "CS120",
    CS140 = "CS140",
}

export type JunctionType = "non-insulating" | "insulating";

export type DisconnectorControlType = "manual" | "remote" | "telecontrol";
export type DisconnectorState = "on" | "off";
