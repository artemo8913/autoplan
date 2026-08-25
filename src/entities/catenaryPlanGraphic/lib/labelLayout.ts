/**
 * Единые формулы геометрии подписей и зигзага на плане.
 *
 * Слои (`ui/*Layer.tsx`) и `HitTestService` обязаны считать позиции только отсюда:
 * раньше формулы были продублированы, и клик по подписи попадал не туда, где она нарисована.
 */

import type { Pos } from "@/shared/types/catenaryTypes";

import type { AnchorSection } from "../model/AnchorSection";
import type { CatenaryPole } from "../model/CatenaryPole";
import type { FixingPoint } from "../model/FixingPoint";
import type { Junction } from "../model/Junction";

export interface OverlapRange {
    start: number;
    end: number;
}

/** Смещения подписей, которые слои берут из DisplaySettingsStore. */
export interface LabelOffsets {
    poleLabelYOffset: number;
    spanLabelYOffset: number;
    zigzagTextXOffset: number;
    zigzagTextYMultiplier: number;
}

/**
 * Направление «от провода к опоре» по оси Y: +1 — опора ниже провода, -1 — выше.
 * Вырожденный случай (ТФ ровно на уровне опоры) сводим к -1 — как в getCatenaryPoses.
 */
export function fpDirectionToPole(fp: FixingPoint): 1 | -1 {
    return fp.startPos.y - fp.endPos.y > 0 ? 1 : -1;
}

// ── Подпись опоры ────────────────────────────────────────────────────────────

/** Сторона подписи опоры: вниз (+1) для нечётной стороны, вверх (-1) для чётной. */
export function poleLabelDirection(pole: CatenaryPole): number {
    return pole.primaryTrack?.directionMultiplier ?? -1;
}

export function poleLabelPos(pole: CatenaryPole, offsets: Pick<LabelOffsets, "poleLabelYOffset">): Pos {
    const { x, y } = pole.pos;
    return { x, y: y + poleLabelDirection(pole) * offsets.poleLabelYOffset };
}

// ── Зигзаг ───────────────────────────────────────────────────────────────────

/** Диапазоны сопряжений, в которых участвует АУ (у секции их может быть два — по одному на конец). */
export function sectionOverlapRanges(sectionId: string, junctions: Junction[]): OverlapRange[] {
    const ranges: OverlapRange[] = [];

    for (const junction of junctions) {
        if (junction.section1.id !== sectionId && junction.section2.id !== sectionId) {
            continue;
        }

        const range = junction.overlapXRange;
        if (range) {
            ranges.push(range);
        }
    }

    return ranges;
}

export function isInOverlap(x: number, ranges: OverlapRange[]): boolean {
    return ranges.some((r) => x >= r.start && x <= r.end);
}

/**
 * Смещение зигзага при отрисовке в зоне сопряжения (вне зоны — 0).
 * Положительный зигзаг = дальше от опоры → смещение ПРОТИВ направления к опоре.
 */
export function zigzagDrawOffset(fp: FixingPoint, ranges: OverlapRange[], zigzagDrawScale: number): number {
    if (!fp.zigzagValue || !isInOverlap(fp.pole.x, ranges)) {
        return 0;
    }

    return -fp.zigzagValue * zigzagDrawScale * fpDirectionToPole(fp);
}

/** Точка привязки символа зигзага (на проводе, с учётом смещения в зоне сопряжения). */
export function zigzagAnchorPos(fp: FixingPoint, drawOffsetY: number): Pos {
    const { x, y } = fp.endPos;
    return { x, y: y + drawOffsetY };
}

/** Позиция текстовой подписи зигзага (значение в мм). */
export function zigzagLabelPos(fp: FixingPoint, offsets: LabelOffsets, drawOffsetY: number): Pos {
    const anchor = zigzagAnchorPos(fp, drawOffsetY);
    return {
        x: anchor.x + offsets.zigzagTextXOffset,
        y: anchor.y + fpDirectionToPole(fp) * offsets.zigzagTextYMultiplier,
    };
}

// ── Длина пролёта ────────────────────────────────────────────────────────────

/** Пара соседних ТФ, для которой рисуется подпись длины пролёта. */
export interface SpanPair {
    /** Ключ для React и для hit-test: пара ТФ однозначно задаёт подпись. */
    key: string;
    leftFp: FixingPoint;
    rightFp: FixingPoint;
}

/**
 * Пары ТФ, образующие пролёты, без дублей.
 *
 * Одна и та же пара опор встречается в двух АУ в зоне сопряжения — подпись рисуется одна,
 * и hit-test обязан ходить по тому же списку, иначе клик попадёт в невидимый дубль из соседней АУ.
 * Список чисто структурный: координаты опор здесь не читаются, поэтому перемещение опоры
 * не заставляет пересобирать список (и не ре-рендерит слой целиком).
 */
export function collectSpanPairs(sections: AnchorSection[]): SpanPair[] {
    const seen = new Set<string>();
    const pairs: SpanPair[] = [];

    for (const section of sections) {
        const fps = section.fixingPoints;

        for (let i = 0; i < fps.length - 1; i++) {
            const leftFp = fps[i];
            const rightFp = fps[i + 1];
            const dedupeKey = `${leftFp.pole.id}_${rightFp.pole.id}`;

            if (seen.has(dedupeKey)) {
                continue;
            }
            seen.add(dedupeKey);

            pairs.push({ key: `${leftFp.id}-${rightFp.id}`, leftFp, rightFp });
        }
    }

    return pairs;
}

export interface SpanLabelLayout {
    pos: Pos;
    spanLength: number;
}

export function spanLabelLayout(
    leftFp: FixingPoint,
    rightFp: FixingPoint,
    offsets: Pick<LabelOffsets, "spanLabelYOffset">,
): SpanLabelLayout {
    const leftX = leftFp.pole.x;
    const rightX = rightFp.pole.x;
    const wireY = leftFp.endPos.y;

    return {
        spanLength: Math.abs(rightX - leftX),
        pos: {
            x: (leftX + rightX) / 2,
            y: wireY + fpDirectionToPole(leftFp) * offsets.spanLabelYOffset,
        },
    };
}
