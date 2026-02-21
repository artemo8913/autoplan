export interface Pos {
    x: number;
    y: number;
}

export interface Poses {
    [globalMeter: number]: Pos 
}

export type RailwayDirection = "even" | "odd";

export interface RailwaySection {
    id: string;
    name: string;

    startX: number;
    endX: number;
    
    tracks: Track[];
    poles: Pole[];
    anchorSections: AnchorSection[];
    wires: Wire[];
}

export interface Track {
    id: string;
    name: string;

    startX: number;
    endX: number;

    poses: Poses;
    globalPoses: Poses;
}


export type PoleFoundation = "separate" | "consolidated" | "pile";
export type PoleMaterial = "metal" | "concrete" | "composite";

export type PoleRelativePositionToTrack = "left" | "right";

export interface Pole {
    id: string;
    number: string;          // номер опоры (например "45/3", "А-12")

    // Позиция
    x: number;               // км+пк+м в метрах
    trackId: string;         // от какого пути считается габарит
    gabY: number;            // габарит от оси пути (м), + вправо, - влево
    relativePosition: PoleRelativePositionToTrack;  // сторона относительно пути

    // Характеристики
    material: PoleMaterial;
    foundation: PoleFoundation;
    height: number;          // высота (м)

    // Что подвешено
    attachments: PoleAttachment[];

    // Консоли / кронштейны
    consoles: Console[];
}

export interface PoleAttachment {
    wireId: string;          // ссылка на провод
    type: "catenary"         // КС (несущий + контактный)
    | "dpr"                // ДПР (два провода ретурн)
    | "feeder"             // питающий
    | "return"             // обратный
    | "reinforcing"        // усиливающий
    | "protective";        // защитный
    side: "left" | "right" | "center";
}

export interface Console {
    direction: "left" | "right";  // направление консоли
    trackId: string;               // к какому пути тянется
    type: "straight" | "curved" | "double";
    length: number;                // длина (м)
}

export type AnchorSectionType = "tension" | "insulating"; // неизолирующее / изолирующее

export interface AnchorSection {
    id: string;
    name: string;           // название участка
    trackId: string;        // путь
    wireType: "catenary" | "dpr";

    startPoleId: string;    // начальная опора (анкерная)
    endPoleId: string;      // конечная опора (анкерная)

    // Сопряжения
    junctions: AnchorJunction[];

    // Средние анкеровки
    midAnchors: MidAnchor[];
}

export interface AnchorJunction {
    id: string;
    type: "non_insulating"   // неизолирующее сопряжение
    | "insulating"          // изолирующее сопряжение
    | "sectioning_point";   // секционирующий пункт

    poleIds: string[];        // опоры сопряжения (обычно 3-4)
    position: number;         // x-координата центра сопряжения

    // Фидерные зоны
    leftFeedZone?: string;
    rightFeedZone?: string;
}

export interface MidAnchor {
    id: string;
    poleId: string;          // опора средней анкеровки
    side: "left" | "right";
}

export type WireType =
    | "contact"        // контактный провод (МФ-100, МФ-150)
    | "messenger"      // несущий трос (М-120, ПБСМ-95)  
    | "dpr_a"          // ДПР-А
    | "dpr_b"          // ДПР-Б
    | "feeder_25"      // питающий 25 кВ
    | "feeder_return"  // обратный фидер
    | "reinforcing"    // усиливающий провод
    | "protective";    // защитный провод

export interface Wire {
    id: string;
    type: WireType;
    brand: string;           // марка провода
    trackId: string;         // над каким путём
    anchorSectionId?: string;

    // Участок подвески
    startX: number;
    endX: number;

    // Высота подвески (для визуализации)
    heightAboveTrack: number;
}