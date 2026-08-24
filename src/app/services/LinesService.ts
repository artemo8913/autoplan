import { RelativeSidePosition } from "@/shared/types/catenaryTypes";
import type { CatenaryType, Pole, WireType } from "@/shared/types/catenaryTypes";
import type { AnchorSection, CrossSpan, FixingPoint, Track, WireLine } from "@/entities/catenaryPlanGraphic";
import {
    AnchorSection as AnchorSectionClass,
    FixingPoint as FixingPointClass,
    WireLine as WireLineClass,
} from "@/entities/catenaryPlanGraphic";

import type { PlanEntityStores } from "../types";
import type { ReversibleOp, UndoStackStore } from "../store/UndoStackStore";
import { BatchCommand } from "../store/UndoStackStore";
import { detachFixingPointFromParent, planDeletion } from "./cascadeRules";

/** Родитель точки фиксации: анкерный участок КС либо линия ВЛ. */
export type FixingPointParent = AnchorSection | WireLine;

export interface NewFixingPointParams {
    pole: Pole;
    track?: Track;
    yOffset?: number;
    crossSpan?: CrossSpan;
    /** Вставить сразу после этой ТФ; без него — в конец списка. */
    afterFpId?: string;
}

/**
 * Единственный вход для правок анкерных участков, линий ВЛ и точек фиксации.
 * Панели не трогают сторы и модели напрямую — каждый метод здесь = команда в undo-стеке.
 */
export class LinesService {
    constructor(
        private readonly stores: PlanEntityStores,
        private readonly undoStackStore: UndoStackStore,
    ) {}

    // ── Анкерные участки ──────────────────────────────────────────────────

    createAnchorSection(): AnchorSection {
        const section = new AnchorSectionClass();

        this.undoStackStore.execute({
            description: "Добавлен анкерный участок",
            execute: () => this.stores.anchorSectionsStore.add(section),
            undo: () => this.stores.anchorSectionsStore.remove(section.id),
        });

        return section;
    }

    deleteAnchorSection(section: AnchorSection): void {
        const { ops, counts } = planDeletion([section.id], this.stores);
        const tail = counts.junctions > 0 ? ` (+${counts.junctions} сопряжений)` : "";

        this.undoStackStore.execute(
            new BatchCommand(`Удалён анкерный участок «${anchorSectionLabel(section)}»${tail}`, ops),
        );
    }

    setAnchorSectionName(section: AnchorSection, name: string): void {
        const prev = section.name;
        this.undoStackStore.execute(
            {
                description: `Наименование АУ: «${prev}» → «${name}»`,
                execute: () => section.setName(name),
                undo: () => section.setName(prev),
            },
            `anchorSection.name:${section.id}`,
        );
    }

    setAnchorSectionType(section: AnchorSection, type: CatenaryType): void {
        const prev = section.type;
        this.undoStackStore.execute({
            description: `Тип подвески АУ: ${prev} → ${type}`,
            execute: () => section.setType(type),
            undo: () => section.setType(prev),
        });
    }

    /** Начальная опора АУ; на новой опоре автоматически появляется оттяжка (влево). */
    setAnchorSectionStartPole(section: AnchorSection, pole: Pole | undefined): void {
        this._setBoundaryPole(section, "start", pole);
    }

    /** Конечная опора АУ; на новой опоре автоматически появляется оттяжка (вправо). */
    setAnchorSectionEndPole(section: AnchorSection, pole: Pole | undefined): void {
        this._setBoundaryPole(section, "end", pole);
    }

    setAnchorSectionPrimaryTrack(section: AnchorSection, track: Track | undefined): void {
        const prev = section.primaryTrack;
        this.undoStackStore.execute({
            description: track ? `Путь АУ: ${track.name}` : "Путь АУ снят",
            execute: () => section.setPrimaryTrack(track),
            undo: () => section.setPrimaryTrack(prev),
        });
    }

    // ── Линии ВЛ ──────────────────────────────────────────────────────────

    createWireLine(wireType: WireType = "vl"): WireLine {
        const wire = new WireLineClass({ wireType, fixingPoints: [] });

        this.undoStackStore.execute({
            description: "Добавлена линия ВЛ",
            execute: () => this.stores.wireLinesStore.add(wire),
            undo: () => this.stores.wireLinesStore.remove(wire.id),
        });

        return wire;
    }

    deleteWireLine(wire: WireLine): void {
        const { ops } = planDeletion([wire.id], this.stores);
        this.undoStackStore.execute(new BatchCommand(`Удалена линия «${wire.label || wire.wireType}»`, ops));
    }

    setWireLineType(wire: WireLine, wireType: WireType): void {
        const prev = wire.wireType;
        this.undoStackStore.execute({
            description: `Тип линии: ${prev} → ${wireType}`,
            execute: () => wire.setWireType(wireType),
            undo: () => wire.setWireType(prev),
        });
    }

    setWireLineLabel(wire: WireLine, label: string | undefined): void {
        const prev = wire.label;
        this.undoStackStore.execute(
            {
                description: `Метка линии: «${prev ?? ""}» → «${label ?? ""}»`,
                execute: () => wire.setLabel(label),
                undo: () => wire.setLabel(prev),
            },
            `wireLine.label:${wire.id}`,
        );
    }

    // ── Точки фиксации ────────────────────────────────────────────────────

    addFixingPoint(parent: FixingPointParent, params: NewFixingPointParams): FixingPoint {
        const fp = buildFixingPoint(params);
        const { afterFpId } = params;

        this.undoStackStore.execute({
            description: `Добавлена точка фиксации (${fp.supportLabel})`,
            execute: () => {
                if (afterFpId) {
                    parent.insertFixingPointAfter(afterFpId, fp);
                } else {
                    parent.addFixingPoint(fp);
                }
                this.stores.fixingPointsStore.add(fp);
            },
            undo: () => {
                parent.removeFixingPoint(fp.id);
                this.stores.fixingPointsStore.remove(fp.id);
            },
        });

        return fp;
    }

    /** Массовое создание ТФ в АУ — одна команда undo на весь набор. */
    bulkAddFixingPoints(section: AnchorSection, points: NewFixingPointParams[]): FixingPoint[] {
        if (points.length === 0) {
            return [];
        }

        const fps = points.map((params) => buildFixingPoint({ track: section.primaryTrack, ...params }));

        const ops: ReversibleOp[] = fps.map((fp) => ({
            execute: () => {
                section.addFixingPoint(fp);
                this.stores.fixingPointsStore.add(fp);
            },
            undo: () => {
                section.removeFixingPoint(fp.id);
                this.stores.fixingPointsStore.remove(fp.id);
            },
        }));

        this.undoStackStore.execute(new BatchCommand(`Добавлено точек фиксации: ${fps.length}`, ops));

        return fps;
    }

    deleteFixingPoint(fp: FixingPoint, parent: FixingPointParent): void {
        const ops: ReversibleOp[] = [
            detachFixingPointFromParent(parent, fp),
            {
                execute: () => this.stores.fixingPointsStore.remove(fp.id),
                undo: () => this.stores.fixingPointsStore.add(fp),
            },
        ];

        this.undoStackStore.execute(new BatchCommand(`Удалена точка фиксации (${fp.supportLabel})`, ops));
    }

    moveFixingPoint(parent: FixingPointParent, fpId: string, direction: "up" | "down"): void {
        const prev = [...parent.fixingPoints];

        this.undoStackStore.execute({
            description: `Порядок точек фиксации: ${direction === "up" ? "вверх" : "вниз"}`,
            execute: () => parent.moveFixingPoint(fpId, direction),
            undo: () => parent.setFixingPoints(prev),
        });
    }

    setFixingPointTrack(fp: FixingPoint, track: Track | undefined): void {
        const prev = fp.track;
        this.undoStackStore.execute({
            description: track ? `Путь точки фиксации: ${track.name}` : "Путь точки фиксации снят",
            execute: () => fp.setTrack(track),
            undo: () => fp.setTrack(prev),
        });
    }

    setFixingPointZigzag(fp: FixingPoint, value: number | undefined): void {
        const prev = fp.zigzagValue;
        this.undoStackStore.execute(
            {
                description: `Зигзаг: ${prev ?? "—"} → ${value ?? "—"}`,
                execute: () => fp.setZigzagValue(value),
                undo: () => fp.setZigzagValue(prev),
            },
            `fixingPoint.zigzag:${fp.id}`,
        );
    }

    setFixingPointYOffset(fp: FixingPoint, value: number): void {
        const prev = fp.yOffset;
        this.undoStackStore.execute(
            {
                description: `Смещение точки фиксации: ${prev} → ${value}`,
                execute: () => fp.setYOffset(value),
                undo: () => fp.setYOffset(prev),
            },
            `fixingPoint.yOffset:${fp.id}`,
        );
    }

    // ── Private ───────────────────────────────────────────────────────────

    private _setBoundaryPole(section: AnchorSection, which: "start" | "end", pole: Pole | undefined): void {
        const isStart = which === "start";
        const prev = isStart ? section.startPole : section.endPole;
        const set = (p: Pole | undefined) => (isStart ? section.setStartPole(p) : section.setEndPole(p));

        const ops: ReversibleOp[] = [{ execute: () => set(pole), undo: () => set(prev) }];

        const guyOp = this._autoAnchorGuyOp(pole, isStart ? RelativeSidePosition.LEFT : RelativeSidePosition.RIGHT);
        if (guyOp) {
            ops.push(guyOp);
        }

        const label = isStart ? "Начальная" : "Конечная";
        this.undoStackStore.execute(
            new BatchCommand(pole ? `${label} опора АУ: №${pole.name}` : `${label} опора АУ снята`, ops),
        );
    }

    /** Граничная опора АУ получает оттяжку автоматически — если её ещё нет. */
    private _autoAnchorGuyOp(pole: Pole | undefined, direction: RelativeSidePosition): ReversibleOp | null {
        if (!pole) {
            return null;
        }

        const catenaryPole = this.stores.catenaryPoleStore.poles.get(pole.id);
        if (!catenaryPole || catenaryPole.anchorGuy) {
            return null;
        }

        return {
            execute: () => catenaryPole.setAnchorGuy({ type: "single", direction }),
            undo: () => catenaryPole.setAnchorGuy(undefined),
        };
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildFixingPoint(params: NewFixingPointParams): FixingPoint {
    return new FixingPointClass({
        pole: params.pole,
        track: params.track,
        yOffset: params.yOffset,
        crossSpan: params.crossSpan,
        supportType: params.crossSpan ? "crossSpan" : "pole",
    });
}

function anchorSectionLabel(section: AnchorSection): string {
    if (section.name) {
        return section.name;
    }
    const poleRange = section.startPole && section.endPole ? ` №${section.startPole.name}–${section.endPole.name}` : "";
    return `${section.type}${poleRange}`;
}
