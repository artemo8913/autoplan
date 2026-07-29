import { KM_LENGTH_M, PICKET_LENGTH_M } from "@/shared/constants";
import type { NonStandardKm, Picketage } from "@/shared/types/catenaryTypes";

// ── Пикетаж: вспомогательные ─────────────────────────────────────────────────

/** Длина нестандартного км в метрах = сумма фактических длин его пикетов. */
export function nonStandardKmLengthMeters(entry: NonStandardKm): number {
    const overrides = entry.picketOverrides ?? {};
    let total = 0;
    for (let i = 0; i < entry.picketCount; i++) {
        total += overrides[i] ?? PICKET_LENGTH_M;
    }
    return total;
}

/** Длина км в метрах: стандартный = 1000, нестандартный = сумма длин его пикетов. */
function kmLengthMeters(entry: NonStandardKm | undefined): number {
    return entry ? nonStandardKmLengthMeters(entry) : KM_LENGTH_M;
}

/** Длина конкретного пикета (0-based) в км. */
function picketLengthMeters(entry: NonStandardKm | undefined, picketIndex: number): number {
    return entry?.picketOverrides?.[picketIndex] ?? PICKET_LENGTH_M;
}

function sortByKm(picketage: Picketage): NonStandardKm[] {
    return [...picketage].sort((a, b) => a.km - b.km);
}

// ── Конвертация ──────────────────────────────────────────────────────────────
//
// `x` — непрерывная физическая координата (метры). Пикетаж (если есть) делает связь
// `x ↔ км/пк/м` кусочно-линейной: рубленые км сдвигают физические границы последующих км.
// Пустой/отсутствующий пикетаж → линейная формула (полная обратная совместимость).

export function kmPkMToMeters(km: number, pk: number, m: number, picketage?: Picketage): number {
    if (!picketage || picketage.length === 0) {
        return km * 1000 + pk * 100 + m;
    }

    let shift = 0; // накопленный сдвиг от рубленых км строго до `km`
    let entryForKm: NonStandardKm | undefined;
    for (const entry of sortByKm(picketage)) {
        if (entry.km < km) {
            shift += kmLengthMeters(entry) - KM_LENGTH_M;
        } else if (entry.km === km) {
            entryForKm = entry;
        }
    }

    const kmStartPhysical = km * KM_LENGTH_M + shift;
    let withinKm = m;
    for (let i = 0; i < pk; i++) {
        withinKm += picketLengthMeters(entryForKm, i);
    }
    return kmStartPhysical + withinKm;
}

export function metersToKmPkM(meters: number, picketage?: Picketage): { km: number; pk: number; m: number } {
    const totalMeters = Math.max(0, Math.round(meters));

    if (!picketage || picketage.length === 0) {
        return linearMetersToKmPkM(totalMeters);
    }

    let shift = 0; // сдвиг от рубленых км, пройденных левее текущей позиции
    for (const entry of sortByKm(picketage)) {
        const physStart = entry.km * KM_LENGTH_M + shift;
        if (totalMeters < physStart) {
            break; // позиция в стандартной зоне до этого рубленого км
        }
        const physEnd = physStart + kmLengthMeters(entry);
        if (totalMeters < physEnd) {
            // позиция внутри рубленого км — идём по фактическим длинам пикетов
            let rem = totalMeters - physStart;
            let pk = 0;
            while (pk < entry.picketCount) {
                const len = picketLengthMeters(entry, pk);
                if (rem < len) {
                    break;
                }
                rem -= len;
                pk++;
            }
            return { km: entry.km, pk, m: rem };
        }
        shift += kmLengthMeters(entry) - KM_LENGTH_M;
    }

    // стандартная зона (до первого / между / после всех рубленых км)
    return linearMetersToKmPkM(totalMeters - shift);
}

function linearMetersToKmPkM(meters: number): { km: number; pk: number; m: number } {
    const km = Math.floor(meters / 1000);
    const remaining = meters - km * 1000;
    const pk = Math.floor(remaining / 100);
    const m = remaining - pk * 100;
    return { km, pk, m };
}

export function formatKmPkM(coords: { km: number; pk: number; m: number }): string {
    return `КМ ${coords.km} ПК ${coords.pk}+${String(coords.m).padStart(2, "0")}`;
}

export function formatOrdinateCompact(meters: number, picketage?: Picketage): string {
    const { km, pk, m } = metersToKmPkM(meters, picketage);
    return `${km}км${pk}пк+${m}`;
}
