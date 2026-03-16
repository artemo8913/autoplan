// ── Перечисление всех типов сущностей ───────────────────────────────────────

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
    | "insulator";

// ── Размещаемые объекты (для PlacementState) ────────────────────────────────

export type PlaceableEntityConfig =
    | { kind: "catenaryPole"; consoleType: "none" | "single" | "double"; material?: "concrete" | "metal" }
    | { kind: "vlPole"; vlType: "intermediate" | "angular" | "terminal" }
    | { kind: "building" }
    | { kind: "signal" }
    | { kind: "platform" }
    | { kind: "crossing" }
    | { kind: "spotlight" };
