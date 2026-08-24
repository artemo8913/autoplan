import type { Pole } from "@/shared/types/catenaryTypes";
import type { AnchorSection, CatenaryPole, CrossSpan } from "@/entities/catenaryPlanGraphic";
import { formatOrdinateCompact } from "@/shared/lib/measure";

export interface BulkFpCandidate {
    key: string;
    kind: "pole" | "crossSpan";
    /** X/identity-якорь будущей ТФ. Для ригеля = одна из опор поперечины (общий X). */
    pole: Pole;
    crossSpan?: CrossSpan;
    x: number;
    label: string;
}

/**
 * Кандидаты на массовое создание ТФ в АУ — два типа точек подвеса в диапазоне опор секции:
 * 1) опоры, привязанные к primaryTrack (консольный подвес);
 * 2) поперечины/ригели, чья балка пересекает primaryTrack на своём пикетаже (подвес на балке).
 * Уже существующие в секции ТФ (по опоре / по поперечине) исключаются. Список отсортирован по X.
 */
export function getBulkFpCandidates(
    section: AnchorSection,
    poles: CatenaryPole[],
    crossSpans: CrossSpan[],
): BulkFpCandidate[] {
    const { startPole, endPole, primaryTrack } = section;
    if (!startPole || !endPole || !primaryTrack) {
        return [];
    }
    const minX = Math.min(startPole.x, endPole.x);
    const maxX = Math.max(startPole.x, endPole.x);
    const trackId = primaryTrack.id;

    const existingPoleIds = new Set(
        section.fixingPoints.filter((fp) => fp.supportType === "pole").map((fp) => fp.pole.id),
    );
    const existingCrossSpanIds = new Set(
        section.fixingPoints
            .filter((fp) => fp.supportType === "crossSpan" && fp.crossSpan)
            .map((fp) => fp.crossSpan!.id),
    );

    const poleCandidates: BulkFpCandidate[] = poles
        .filter((p) => p.x >= minX && p.x <= maxX && p.hasTrack(trackId) && !existingPoleIds.has(p.id))
        .map((p) => ({
            key: `pole:${p.id}`,
            kind: "pole",
            pole: p,
            x: p.x,
            label: `Опора №${p.name} · ${formatOrdinateCompact(p.x)}`,
        }));

    const crossSpanCandidates: BulkFpCandidate[] = crossSpans
        .filter((cs) => {
            if (existingCrossSpanIds.has(cs.id)) {
                return false;
            }
            const midX = (cs.poleA.x + cs.poleB.x) / 2;
            if (midX < minX || midX > maxX) {
                return false;
            }
            // Балка поперечины должна пересекать путь: Y провода на пикетаже поперечины
            // лежит между опорами поперечины по Y.
            const trackY = primaryTrack.getPositionAtX(midX).y;
            const yMin = Math.min(cs.poleA.pos.y, cs.poleB.pos.y);
            const yMax = Math.max(cs.poleA.pos.y, cs.poleB.pos.y);
            return trackY >= yMin && trackY <= yMax;
        })
        .map((cs) => {
            const midX = (cs.poleA.x + cs.poleB.x) / 2;
            const typeLabel = cs.spanType === "rigid" ? "Ригель" : "Поперечина";
            return {
                key: `crossSpan:${cs.id}`,
                kind: "crossSpan",
                pole: cs.poleA,
                crossSpan: cs,
                x: midX,
                label: `${typeLabel} · ${formatOrdinateCompact(midX)}`,
            };
        });

    return [...poleCandidates, ...crossSpanCandidates].sort((a, b) => a.x - b.x);
}
