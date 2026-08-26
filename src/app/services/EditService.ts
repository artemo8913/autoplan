import { RelativeSidePosition, type GroundingType } from "@/shared/types/catenaryTypes";
import type { CatenaryPole } from "@/entities/catenaryPlanGraphic";
import { BatchCommand } from "../store/UndoStackStore";
import type { ReversibleOp, UndoStackStore } from "../store/UndoStackStore";
import type { TracksStore } from "../store/TracksStore";

type AnchorGuyType = "none" | "single" | "double";

/**
 * Правки свойств опор КС — и одиночные (панель одной опоры), и массовые (мультивыделение).
 * Обе ветки собраны из одних и тех же обратимых операций; различаются только описанием
 * в undo-стеке и тем, что одиночные текстовые/числовые поля склеиваются по mergeKey.
 */
export class EditService {
    constructor(
        private readonly undoStackStore: UndoStackStore,
        private readonly tracksStore: TracksStore,
    ) {}

    // ── Одиночная опора ───────────────────────────────────────────────────

    setPoleName(pole: CatenaryPole, name: string): void {
        const prev = pole.name;
        this._runSingle(
            `Наименование опоры: ${prev} → ${name}`,
            { execute: () => pole.setName(name), undo: () => pole.setName(prev) },
            `pole.name:${pole.id}`,
        );
    }

    setPoleX(pole: CatenaryPole, x: number): void {
        const prev = pole.x;
        this._runSingle(
            `Положение опоры №${pole.name}`,
            { execute: () => pole.setX(x), undo: () => pole.setX(prev) },
            `pole.x:${pole.id}`,
        );
    }

    setPoleMaterial(pole: CatenaryPole, value: "concrete" | "metal"): void {
        this._runSingle(`Материал опоры №${pole.name}`, materialOp(pole, value));
    }

    setPoleAnchorGuyType(pole: CatenaryPole, value: AnchorGuyType): void {
        this._runSingle(`Оттяжка опоры №${pole.name}`, anchorGuyTypeOp(pole, value));
    }

    togglePoleAnchorGuyDirection(pole: CatenaryPole): void {
        const op = anchorGuyDirectionToggleOp(pole);
        if (op) {
            this._runSingle(`Направление оттяжки опоры №${pole.name}`, op);
        }
    }

    setPoleAnchorBrace(pole: CatenaryPole, enabled: boolean): void {
        this._runSingle(`Подкос опоры №${pole.name}`, anchorBraceOp(pole, enabled));
    }

    setPoleGrounding(pole: CatenaryPole, value: GroundingType | "none"): void {
        this._runSingle(`Заземление опоры №${pole.name}`, groundingOp(pole, value));
    }

    setPoleTrackGabarit(pole: CatenaryPole, trackId: string, value: number): void {
        const op = trackGabaritOp(pole, trackId, value);
        if (op) {
            this._runSingle(`Габарит опоры №${pole.name}`, op, `pole.gabarit:${pole.id}:${trackId}`);
        }
    }

    togglePoleTrackDirection(pole: CatenaryPole, trackId: string): void {
        const op = trackDirectionToggleOp(pole, trackId);
        if (op) {
            this._runSingle(`Сторона опоры №${pole.name} относительно пути`, op);
        }
    }

    addPoleTrack(pole: CatenaryPole, trackId: string): void {
        const track = this.tracksStore.tracks.get(trackId);
        if (!track || pole.hasTrack(trackId)) {
            return;
        }
        this._runSingle(
            `Опоре №${pole.name} добавлен путь ${track.name}`,
            bindingsOp(pole, () => pole.addTrackBinding(track)),
        );
    }

    removePoleTrack(pole: CatenaryPole, trackId: string): void {
        if (!pole.hasTrack(trackId)) {
            return;
        }
        this._runSingle(
            `У опоры №${pole.name} удалена привязка к пути`,
            bindingsOp(pole, () => pole.removeTrackBinding(trackId)),
        );
    }

    /** Назначить главный путь опоры: по нему считается положение опоры и её габарит. */
    setPolePrimaryTrack(pole: CatenaryPole, trackId: string): void {
        const binding = pole.getBinding(trackId);
        if (!binding || pole.primaryTrackId === trackId) {
            return;
        }
        this._runSingle(
            `Главный путь опоры №${pole.name}: ${binding.track.name}`,
            bindingsOp(pole, () => pole.setPrimaryTrack(trackId)),
        );
    }

    // ── Bulk: материал ────────────────────────────────────────────────────

    setBulkMaterial(poles: CatenaryPole[], value: "concrete" | "metal"): void {
        this._runBulk(
            poles.map((p) => materialOp(p, value)),
            (n) => `Изменён материал для ${n} опор`,
        );
    }

    // ── Bulk: анкерная оттяжка (тип) ──────────────────────────────────────

    setBulkAnchorGuyType(poles: CatenaryPole[], value: AnchorGuyType): void {
        this._runBulk(
            poles.map((p) => anchorGuyTypeOp(p, value)),
            (n) => `Изменена оттяжка для ${n} опор`,
        );
    }

    // ── Bulk: анкерная оттяжка (направление — toggle) ─────────────────────

    toggleBulkAnchorGuyDirection(poles: CatenaryPole[]): void {
        this._runBulk(
            poles.map((p) => anchorGuyDirectionToggleOp(p)),
            (n) => `Изменено направление оттяжки для ${n} опор`,
        );
    }

    // ── Bulk: подкос ──────────────────────────────────────────────────────

    setBulkAnchorBrace(poles: CatenaryPole[], enabled: boolean): void {
        this._runBulk(
            poles.map((p) => anchorBraceOp(p, enabled)),
            (n) => `Изменён подкос для ${n} опор`,
        );
    }

    // ── Bulk: заземление ──────────────────────────────────────────────────

    setBulkGrounding(poles: CatenaryPole[], value: GroundingType | "none"): void {
        this._runBulk(
            poles.map((p) => groundingOp(p, value)),
            (n) => `Изменено заземление для ${n} опор`,
        );
    }

    // ── Bulk: габарит пути ────────────────────────────────────────────────

    setBulkTrackGabarit(poles: CatenaryPole[], trackId: string, value: number): void {
        this._runBulk(
            poles.map((p) => trackGabaritOp(p, trackId, value)),
            (n) => `Изменён габарит для ${n} опор`,
        );
    }

    // ── Bulk: направление пути (toggle) ───────────────────────────────────

    toggleBulkTrackDirection(poles: CatenaryPole[], trackId: string): void {
        this._runBulk(
            poles.map((p) => trackDirectionToggleOp(p, trackId)),
            (n) => `Изменено направление для ${n} опор`,
        );
    }

    // ── Bulk: перенос привязки (путь X → путь Y) ──────────────────────────

    reassignBulkTrack(poles: CatenaryPole[], fromTrackId: string, toTrackId: string): void {
        const toTrack = this.tracksStore.tracks.get(toTrackId);
        if (!toTrack || fromTrackId === toTrackId) {
            return;
        }
        this._runBulk(
            poles.map((p) => {
                if (!p.hasTrack(fromTrackId) || p.hasTrack(toTrackId)) {
                    return null;
                }
                return bindingsOp(p, () => p.replaceTrackBinding(fromTrackId, toTrack));
            }),
            (n) => `Перенесена привязка для ${n} опор`,
        );
    }

    // ── Bulk: добавление пути ──────────────────────────────────────────────

    addBulkTrack(poles: CatenaryPole[], trackId: string): void {
        const track = this.tracksStore.tracks.get(trackId);
        if (!track) {
            return;
        }
        this._runBulk(
            poles.map((p) => {
                if (p.hasTrack(trackId)) {
                    return null;
                }
                return bindingsOp(p, () => p.addTrackBinding(track));
            }),
            (n) => `Добавлен путь для ${n} опор`,
        );
    }

    // ── Bulk: удаление пути ────────────────────────────────────────────────

    removeBulkTrack(poles: CatenaryPole[], trackId: string): void {
        this._runBulk(
            poles.map((p) => {
                // не удаляем единственную привязку — иначе Y опоры станет 0
                if (!p.hasTrack(trackId) || p.trackBindings.length <= 1) {
                    return null;
                }
                return bindingsOp(p, () => p.removeTrackBinding(trackId));
            }),
            (n) => `Удалён путь для ${n} опор`,
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

// ── Обратимые операции над одной опорой ───────────────────────────────────────

function materialOp(pole: CatenaryPole, value: "concrete" | "metal"): ReversibleOp {
    const prev = pole.material as "concrete" | "metal";
    return { execute: () => pole.setMaterial(value), undo: () => pole.setMaterial(prev) };
}

function anchorGuyTypeOp(pole: CatenaryPole, value: AnchorGuyType): ReversibleOp {
    const prev = pole.anchorGuy;
    return {
        execute: () => {
            if (value === "none") {
                pole.setAnchorGuy(undefined);
            } else {
                pole.setAnchorGuy({ type: value, direction: prev?.direction ?? RelativeSidePosition.LEFT });
            }
        },
        undo: () => pole.setAnchorGuy(prev),
    };
}

function anchorGuyDirectionToggleOp(pole: CatenaryPole): ReversibleOp | null {
    const prev = pole.anchorGuy;
    if (!prev) {
        return null;
    }
    const direction =
        prev.direction === RelativeSidePosition.LEFT ? RelativeSidePosition.RIGHT : RelativeSidePosition.LEFT;
    return {
        execute: () => pole.setAnchorGuy({ ...prev, direction }),
        undo: () => pole.setAnchorGuy(prev),
    };
}

function anchorBraceOp(pole: CatenaryPole, enabled: boolean): ReversibleOp {
    const prev = pole.anchorBrace;
    return {
        execute: () => pole.setAnchorBrace(enabled ? { direction: RelativeSidePosition.RIGHT } : undefined),
        undo: () => pole.setAnchorBrace(prev),
    };
}

function groundingOp(pole: CatenaryPole, value: GroundingType | "none"): ReversibleOp {
    const prev = pole.grounding;
    const next = value === "none" ? undefined : value;
    return { execute: () => pole.setGrounding(next), undo: () => pole.setGrounding(prev) };
}

/**
 * Обёртка над любой правкой привязок: откат возвращает весь набор привязок и главный путь.
 * Правка одного пути пересчитывает габариты остальных, поэтому точечная инверсия
 * («вернуть прежний габарит») восстановила бы соседние пути лишь с точностью округления.
 */
function bindingsOp(pole: CatenaryPole, apply: () => void): ReversibleOp {
    const prev = [...pole.trackBindings];
    const prevPrimaryTrackId = pole.primaryTrackId;
    return {
        execute: apply,
        undo: () => pole.setTrackBindings(prev, prevPrimaryTrackId),
    };
}

function trackGabaritOp(pole: CatenaryPole, trackId: string, value: number): ReversibleOp | null {
    if (!pole.hasTrack(trackId)) {
        return null;
    }
    return bindingsOp(pole, () => pole.setTrackGabarit(trackId, value));
}

function trackDirectionToggleOp(pole: CatenaryPole, trackId: string): ReversibleOp | null {
    if (!pole.hasTrack(trackId)) {
        return null;
    }
    return bindingsOp(pole, () => pole.flipTrackSide(trackId));
}
