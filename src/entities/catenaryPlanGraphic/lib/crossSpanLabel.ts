import type { CrossSpan } from "../model/CrossSpan";

/** Название типа поперечины: «Ригель» для жёсткой, «Гибкая поперечина» — для тросовой. */
export function crossSpanTypeLabel(spanType: CrossSpan["spanType"]): string {
    return spanType === "rigid" ? "Ригель" : "Гибкая поперечина";
}

/**
 * Человеческое имя поперечины: тип + опоры, между которыми она стоит.
 * Своего имени у поперечины нет, а «cs-4f2a…» в панели и в undo-стеке не читается.
 */
export function crossSpanLabel(crossSpan: CrossSpan): string {
    return `${crossSpanTypeLabel(crossSpan.spanType)} №${crossSpan.poleA.name}–№${crossSpan.poleB.name}`;
}
