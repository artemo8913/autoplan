import type { CrossSpanType } from "@/shared/types/catenaryTypes";

/**
 * Подсказки марок для полей панели поперечин.
 *
 * Это именно подсказки, а не справочник: единой технологической базы (ЕТБ, п. 8.11 PLAN.md)
 * в приложении пока нет, поэтому марка вводится свободным текстом, а список лишь избавляет
 * от набора самых частых значений. Когда появится ЕТБ, поле станет выбором позиции справочника,
 * и этот файл уйдёт целиком.
 */

/** Типовые марки ригелей жёстких поперечин. */
export const RIGID_BEAM_MARKS = ["Р-1", "Р-2", "Р-3", "Р-4", "Р-5", "Р-6", "Р-7"];

/** Типовые марки тросов гибких поперечин (поперечный несущий и фиксирующие). */
export const FLEXIBLE_WIRE_MARKS = ["ПБСМ-70", "ПБСМ-95", "ПБСА-50/70", "М-95", "М-120"];

export function markSuggestions(spanType: CrossSpanType): string[] {
    return spanType === "rigid" ? RIGID_BEAM_MARKS : FLEXIBLE_WIRE_MARKS;
}

/** Подпись поля марки: у ригеля и у троса это разные характеристики. */
export function markFieldLabel(spanType: CrossSpanType): string {
    return spanType === "rigid" ? "Марка (профиль) ригеля" : "Марка троса";
}
