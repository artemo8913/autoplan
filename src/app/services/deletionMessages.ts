import type { DeletionCounts } from "./cascadeRules";

/**
 * Человеческие формулировки последствий удаления.
 * Одно место на все подтверждения: канва (Delete), панели путей, линий и сопряжений.
 */

const LABELS: Array<{ key: keyof DeletionCounts; one: string; few: string; many: string }> = [
    { key: "poles", one: "опора КС", few: "опоры КС", many: "опор КС" },
    { key: "vlPoles", one: "опора ВЛ", few: "опоры ВЛ", many: "опор ВЛ" },
    { key: "tracks", one: "путь", few: "пути", many: "путей" },
    { key: "crossSpans", one: "поперечина", few: "поперечины", many: "поперечин" },
    { key: "disconnectors", one: "разъединитель", few: "разъединителя", many: "разъединителей" },
    { key: "anchorSections", one: "анкерный участок", few: "анкерных участка", many: "анкерных участков" },
    { key: "wireLines", one: "линия", few: "линии", many: "линий" },
    { key: "junctions", one: "сопряжение", few: "сопряжения", many: "сопряжений" },
    { key: "fixingPoints", one: "точка фиксации", few: "точки фиксации", many: "точек фиксации" },
];

/** Русское склонение по числу: 1 опора, 2 опоры, 5 опор. */
export function plural(count: number, one: string, few: string, many: string): string {
    const mod100 = count % 100;
    if (mod100 >= 11 && mod100 <= 14) {
        return many;
    }
    switch (count % 10) {
        case 1:
            return one;
        case 2:
        case 3:
        case 4:
            return few;
        default:
            return many;
    }
}

export function totalDeletionCount(counts: DeletionCounts): number {
    return Object.values(counts).reduce((sum, n) => sum + n, 0);
}

/**
 * Список «что будет удалено» — по строке на тип сущности, нулевые типы опускаются.
 * Порядок фиксирован (от крупного к мелкому), чтобы формулировка не «прыгала».
 */
export function describeDeletion(counts: DeletionCounts): string[] {
    return LABELS.filter(({ key }) => counts[key] > 0).map(({ key, one, few, many }) => {
        const count = counts[key];
        return `${plural(count, one, few, many)}: ${count}`;
    });
}

/** Что потеряет привязку при удалении пути (сами объекты остаются). */
export interface TrackDetachImpact {
    poles: number;
    fixingPoints: number;
}

export function describeTrackDetach({ poles, fixingPoints }: TrackDetachImpact): string[] {
    const lines: string[] = [];
    if (poles > 0) {
        lines.push(`Опоры потеряют привязку к пути: ${poles}`);
    }
    if (fixingPoints > 0) {
        lines.push(`Точки фиксации потеряют привязку к пути: ${fixingPoints}`);
    }
    return lines;
}
