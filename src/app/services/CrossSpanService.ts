import type { CrossSpanType } from "@/shared/types/catenaryTypes";
import type { CrossSpan } from "@/entities/catenaryPlanGraphic";
import { crossSpanLabel } from "@/entities/catenaryPlanGraphic";

import { BatchCommand } from "../store/UndoStackStore";
import type { ReversibleOp, UndoStackStore } from "../store/UndoStackStore";

/**
 * Правки характеристик поперечин — одиночные (панель одной поперечины) и массовые
 * (мультивыделение). Устроено так же, как `EditService` для опор: обе ветки собраны
 * из одних и тех же обратимых операций, различаются описанием в undo-стеке и склейкой
 * текстовых/числовых полей по mergeKey.
 */
export class CrossSpanService {
    constructor(private readonly undoStackStore: UndoStackStore) {}

    // ── Одна поперечина ───────────────────────────────────────────────────

    setSpanType(crossSpan: CrossSpan, value: CrossSpanType): void {
        this._runSingle(`Тип поперечины: ${crossSpanLabel(crossSpan)}`, spanTypeOp(crossSpan, value));
    }

    /** Марка пишется в поле по текущему типу: у жёсткой — ригеля, у гибкой — троса. */
    setMark(crossSpan: CrossSpan, value: string): void {
        this._runSingle(
            `${crossSpan.spanType === "rigid" ? "Марка ригеля" : "Марка троса"}: ${crossSpanLabel(crossSpan)}`,
            markOp(crossSpan, value),
            `crossSpan.mark:${crossSpan.id}`,
        );
    }

    setLoadKn(crossSpan: CrossSpan, value: number | undefined): void {
        this._runSingle(
            `Нагрузка: ${crossSpanLabel(crossSpan)}`,
            loadOp(crossSpan, value),
            `crossSpan.load:${crossSpan.id}`,
        );
    }

    // ── Мультивыделение ───────────────────────────────────────────────────

    setBulkSpanType(crossSpans: CrossSpan[], value: CrossSpanType): void {
        this._runBulk(
            crossSpans.map((cs) => (cs.spanType === value ? null : spanTypeOp(cs, value))),
            (n) => `Изменён тип у ${n} поперечин`,
        );
    }

    setBulkMark(crossSpans: CrossSpan[], value: string): void {
        this._runBulk(
            crossSpans.map((cs) => (cs.mark === normalizeMark(value) ? null : markOp(cs, value))),
            (n) => `Изменена марка у ${n} поперечин`,
        );
    }

    setBulkLoadKn(crossSpans: CrossSpan[], value: number | undefined): void {
        this._runBulk(
            crossSpans.map((cs) => (cs.loadKn === value ? null : loadOp(cs, value))),
            (n) => `Изменена нагрузка у ${n} поперечин`,
        );
    }

    // ── Private ───────────────────────────────────────────────────────────

    private _runSingle(description: string, op: ReversibleOp, mergeKey?: string): void {
        this.undoStackStore.execute({ description, ...op }, mergeKey);
    }

    private _runBulk(ops: Array<ReversibleOp | null>, describe: (count: number) => string): void {
        const applicable = ops.filter((op): op is ReversibleOp => op !== null);
        if (applicable.length === 0) {
            return;
        }
        this.undoStackStore.execute(new BatchCommand(describe(applicable.length), applicable));
    }
}

// ── Обратимые операции над одной поперечиной ──────────────────────────────────

function spanTypeOp(crossSpan: CrossSpan, value: CrossSpanType): ReversibleOp {
    const prev = crossSpan.spanType;
    return { execute: () => crossSpan.setSpanType(value), undo: () => crossSpan.setSpanType(prev) };
}

/**
 * Пустая строка — это «марка не задана», а не марка из пробелов: поле очищается в undefined,
 * иначе пустая строка уехала бы в DTO и в будущие ведомости.
 */
function normalizeMark(value: string): string | undefined {
    return value.trim() === "" ? undefined : value;
}

function markOp(crossSpan: CrossSpan, value: string): ReversibleOp {
    const next = normalizeMark(value);
    const isRigid = crossSpan.spanType === "rigid";
    const prev = isRigid ? crossSpan.beamMark : crossSpan.wireMark;
    const set = (v: string | undefined) => (isRigid ? crossSpan.setBeamMark(v) : crossSpan.setWireMark(v));
    return { execute: () => set(next), undo: () => set(prev) };
}

function loadOp(crossSpan: CrossSpan, value: number | undefined): ReversibleOp {
    const next = value === undefined || Number.isNaN(value) ? undefined : value;
    const prev = crossSpan.loadKn;
    return { execute: () => crossSpan.setLoadKn(next), undo: () => crossSpan.setLoadKn(prev) };
}
