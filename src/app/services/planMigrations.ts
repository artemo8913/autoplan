import type { PlanDTO } from "@/shared/types/planTypes";

/**
 * Текущая версия формата PlanDTO.
 * Поднимать при каждом изменении формата, которое не читается старым кодом как есть,
 * и добавлять соответствующий шаг в MIGRATIONS.
 */
export const CURRENT_PLAN_VERSION = 2;

/** План неизвестной версии: до чтения `version` о структуре ничего не известно. */
type UnversionedPlan = Record<string, unknown>;

/**
 * Лесенка миграций: ключ N — переход с версии N на N+1.
 * Планы, сохранённые до введения версий, читаются как версия 0.
 */
const MIGRATIONS: Record<number, (dto: UnversionedPlan) => UnversionedPlan> = {
    // 0 → 1: версий не было, структура та же — только проставляем номер.
    0: (dto) => ({ ...dto, version: 1 }),
    // 1 → 2: пара «габарит + сторона» у привязки опоры схлопнута в знаковое смещение.
    1: (dto) => ({ ...signedTrackOffsets(dto), version: 2 }),
};

/**
 * 1 → 2: `{ gabarit, relativePositionToTrack }` → `{ offsetMeters }`.
 * Знак — как у `yOffsetMeters` пути: «+» вниз по чертежу. Сторона задавалась относительно
 * направления пути, поэтому переводится умножением на его directionMultiplier.
 * Опора, у которой путь не нашёлся, сохраняет габарит как смещение вниз: план всё равно
 * не пройдёт проверку ссылочной целостности, но миграция не должна падать раньше неё.
 */
function signedTrackOffsets(dto: UnversionedPlan): UnversionedPlan {
    const tracks = Array.isArray(dto.tracks) ? (dto.tracks as UnversionedPlan[]) : [];
    const directionByTrackId = new Map<string, number>();
    for (const track of tracks) {
        const yOffset = typeof track.yOffsetMeters === "number" ? track.yOffsetMeters : 0;
        directionByTrackId.set(String(track.id), yOffset >= 0 ? 1 : -1);
    }

    const poles = Array.isArray(dto.catenaryPoles) ? (dto.catenaryPoles as UnversionedPlan[]) : [];

    return {
        ...dto,
        catenaryPoles: poles.map((pole) => {
            const bindings = Array.isArray(pole.trackBindings) ? (pole.trackBindings as UnversionedPlan[]) : [];

            return {
                ...pole,
                trackBindings: bindings.map((binding) => {
                    const gabarit = typeof binding.gabarit === "number" ? binding.gabarit : 0;
                    const side = binding.relativePositionToTrack === -1 ? -1 : 1;
                    const direction = directionByTrackId.get(String(binding.trackId)) ?? 1;

                    return { trackId: binding.trackId, offsetMeters: gabarit * side * direction };
                }),
            };
        }),
    };
}

export type MigrationResult =
    | { ok: true; dto: PlanDTO; migratedFrom: number | null }
    | { ok: false; reason: string };

/**
 * Приводит план любой поддерживаемой версии к текущей.
 * Структуру плана не валидирует (это отдельная задача) — отвечает только за версионность.
 */
export function migratePlanDTO(raw: unknown): MigrationResult {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
        return { ok: false, reason: "Файл не похож на план" };
    }

    const source = raw as UnversionedPlan;
    const rawVersion = source.version;
    // Отсутствие поля = план сохранён до введения версий.
    const version = rawVersion === undefined ? 0 : rawVersion;

    if (typeof version !== "number" || !Number.isInteger(version) || version < 0) {
        return { ok: false, reason: `Некорректная версия формата плана: ${String(rawVersion)}` };
    }

    if (version > CURRENT_PLAN_VERSION) {
        return {
            ok: false,
            reason:
                `План сохранён в более новой версии программы ` +
                `(формат ${version}, поддерживается до ${CURRENT_PLAN_VERSION}). Обновите приложение.`,
        };
    }

    let current = source;
    for (let v = version; v < CURRENT_PLAN_VERSION; v++) {
        const migration = MIGRATIONS[v];
        if (!migration) {
            return { ok: false, reason: `Нет миграции формата с версии ${v} на ${v + 1}` };
        }
        current = migration(current);
    }

    return {
        ok: true,
        dto: current as unknown as PlanDTO,
        migratedFrom: version === CURRENT_PLAN_VERSION ? null : version,
    };
}
