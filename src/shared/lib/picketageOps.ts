import { PICKET_LENGTH_M, PICKETS_PER_KM } from "@/shared/constants";
import type { NonStandardKm, Picketage } from "@/shared/types/catenaryTypes";

// Иммутабельные трансформы пикетажа (Picketage → Picketage) + валидация.
// Модель хранит только `picketage` + `setPicketage`; редактор зовёт
// `railway.setPicketage(transform(railway.picketage, …))`. Вся логика — здесь и тестируема.

function sortByKm(picketage: Picketage): Picketage {
    return [...picketage].sort((a, b) => a.km - b.km);
}

/** Убрать пустой словарь отклонений (для разрежённости). */
function normalizeOverrides(overrides: Record<number, number>): Record<number, number> | undefined {
    return Object.keys(overrides).length > 0 ? overrides : undefined;
}

export function findEntry(picketage: Picketage, km: number): NonStandardKm | undefined {
    return picketage.find((e) => e.km === km);
}

/** Добавить нестандартный км (стартует стандартным: 10 ПК, без отклонений). No-op, если км уже есть. */
export function addNonStandardKm(picketage: Picketage, km: number): Picketage {
    if (picketage.some((e) => e.km === km)) {
        return picketage;
    }
    return sortByKm([...picketage, { km, picketCount: PICKETS_PER_KM }]);
}

export function removeNonStandardKm(picketage: Picketage, km: number): Picketage {
    return picketage.filter((e) => e.km !== km);
}

/** Переименовать км. No-op при совпадении или если новый номер уже занят. */
export function renameKm(picketage: Picketage, oldKm: number, newKm: number): Picketage {
    if (oldKm === newKm || picketage.some((e) => e.km === newKm)) {
        return picketage;
    }
    return sortByKm(picketage.map((e) => (e.km === oldKm ? { ...e, km: newKm } : e)));
}

/** Задать число пикетов (≥ 1). Авто-удаление осиротевших отклонений с индексом ≥ нового количества. */
export function setPicketCount(picketage: Picketage, km: number, count: number): Picketage {
    const next = Math.max(1, Math.floor(count));
    return picketage.map((e) => {
        if (e.km !== km) {
            return e;
        }
        let overrides = e.picketOverrides;
        if (overrides) {
            const kept: Record<number, number> = {};
            for (const key of Object.keys(overrides)) {
                const idx = Number(key);
                if (idx < next) {
                    kept[idx] = overrides[idx];
                }
            }
            overrides = normalizeOverrides(kept);
        }
        return { ...e, picketCount: next, picketOverrides: overrides };
    });
}

/** Задать длину пикета. Длина == 100 не хранится (разрежённость). */
export function setPicketOverride(picketage: Picketage, km: number, idx: number, lengthM: number): Picketage {
    return picketage.map((e) => {
        if (e.km !== km || idx < 0 || idx >= e.picketCount) {
            return e;
        }
        const overrides = { ...(e.picketOverrides ?? {}) };
        if (lengthM === PICKET_LENGTH_M) {
            delete overrides[idx];
        } else {
            overrides[idx] = lengthM;
        }
        return { ...e, picketOverrides: normalizeOverrides(overrides) };
    });
}

/** Убрать отклонение (пикет снова 100 м). */
export function removePicketOverride(picketage: Picketage, km: number, idx: number): Picketage {
    return picketage.map((e) => {
        if (e.km !== km || !e.picketOverrides) {
            return e;
        }
        const overrides = { ...e.picketOverrides };
        delete overrides[idx];
        return { ...e, picketOverrides: normalizeOverrides(overrides) };
    });
}

// ── Хелперы для UI ───────────────────────────────────────────────────────────

/** Отклонения по возрастанию номера ПК (для отображения списком). */
export function sortedOverrides(entry: NonStandardKm): { idx: number; lengthM: number }[] {
    const overrides = entry.picketOverrides ?? {};
    return Object.keys(overrides)
        .map(Number)
        .sort((a, b) => a - b)
        .map((idx) => ({ idx, lengthM: overrides[idx] }));
}

/** Число пикетов в км (для нестандартного — из записи, иначе стандартные 10). */
export function picketCountForKm(picketage: Picketage, km: number): number {
    return findEntry(picketage, km)?.picketCount ?? PICKETS_PER_KM;
}

/** Длина пикета (км, индекс ПК) в метрах — с учётом отклонений; иначе 100. */
export function picketLengthForKmPk(picketage: Picketage, km: number, pk: number): number {
    return findEntry(picketage, km)?.picketOverrides?.[pk] ?? PICKET_LENGTH_M;
}

/** Верхние границы полей ввода ПК/М для данной точки км/пк (для KmPkMInput). */
export function kmPkMLimits(picketage: Picketage, km: number, pk: number): { maxPk: number; maxM: number } {
    return {
        maxPk: picketCountForKm(picketage, km) - 1,
        maxM: picketLengthForKmPk(picketage, km, pk) - 1,
    };
}

/** Пикеты 0..count-1, ещё не переопределённые (для select «+ рубленый пикет»). */
export function availablePicketIndices(entry: NonStandardKm): number[] {
    const overrides = entry.picketOverrides ?? {};
    const result: number[] = [];
    for (let i = 0; i < entry.picketCount; i++) {
        if (!(i in overrides)) {
            result.push(i);
        }
    }
    return result;
}

// ── Валидация ────────────────────────────────────────────────────────────────

export type ValidationResult = { ok: true } | { ok: false; reason: string };

export function validateKmNumber(
    km: number,
    startKm: number,
    endKm: number,
    existingKms: number[],
): ValidationResult {
    if (!Number.isInteger(km)) {
        return { ok: false, reason: "Номер км должен быть целым" };
    }
    if (km < startKm || km > endKm) {
        return { ok: false, reason: `Км вне участка (${startKm}…${endKm})` };
    }
    if (existingKms.includes(km)) {
        return { ok: false, reason: "Такой км уже задан" };
    }
    return { ok: true };
}

export function validatePicketLength(lengthM: number): ValidationResult {
    if (!Number.isInteger(lengthM)) {
        return { ok: false, reason: "Длина должна быть целой" };
    }
    if (lengthM <= 0) {
        return { ok: false, reason: "Длина должна быть > 0" };
    }
    return { ok: true };
}
