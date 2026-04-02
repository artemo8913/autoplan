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
