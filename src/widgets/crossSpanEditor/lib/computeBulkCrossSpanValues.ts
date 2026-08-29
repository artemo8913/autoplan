import type { CrossSpan } from "@/entities/catenaryPlanGraphic";
import type { CrossSpanType } from "@/shared/types/catenaryTypes";

export interface BulkCrossSpanValues {
    spanType: CrossSpanType | "mixed";
    /** Марка по текущему типу каждой поперечины; `undefined` — ни у одной не задана. */
    mark: string | undefined | "mixed";
    loadKn: number | undefined | "mixed";
}

function common<T>(values: T[]): T | "mixed" {
    return values.every((v) => v === values[0]) ? values[0] : "mixed";
}

/**
 * Общие значения характеристик выделенных поперечин: одинаковое значение или «разные».
 * Поле марки при разных типах бессмысленно (марка ригеля ≠ марка троса) — панель его прячет,
 * а здесь оно всё равно считается по видимой марке каждой поперечины.
 */
export function computeBulkCrossSpanValues(crossSpans: CrossSpan[]): BulkCrossSpanValues {
    if (crossSpans.length === 0) {
        return { spanType: "flexible", mark: undefined, loadKn: undefined };
    }

    return {
        spanType: common(crossSpans.map((cs) => cs.spanType)),
        mark: common(crossSpans.map((cs) => cs.mark)),
        loadKn: common(crossSpans.map((cs) => cs.loadKn)),
    };
}
