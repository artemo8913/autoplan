import { RelativeSidePosition, type GroundingType } from "@/shared/types/catenaryTypes";
import type { CatenaryPole } from "@/entities/catenaryPlanGraphic";
import { BatchCommand } from "../store/UndoStackStore";
import type { UndoStackStore } from "../store/UndoStackStore";
import type { TracksStore } from "../store/TracksStore";

export class EditService {
    constructor(
        private readonly undoStackStore: UndoStackStore,
        private readonly tracksStore: TracksStore,
    ) {}

    // ── Bulk: материал ────────────────────────────────────────────────────

    setBulkMaterial(poles: CatenaryPole[], value: "concrete" | "metal"): void {
        const commands = poles.map((p) => {
            const prev = p.material as "concrete" | "metal";
            return { description: "", execute: () => p.setMaterial(value), undo: () => p.setMaterial(prev) };
        });
        this.undoStackStore.execute(new BatchCommand(`Изменён материал для ${poles.length} опор`, commands));
    }

    // ── Bulk: анкерная оттяжка (тип) ──────────────────────────────────────

    setBulkAnchorGuyType(poles: CatenaryPole[], value: "none" | "single" | "double"): void {
        const commands = poles.map((p) => {
            const prev = p.anchorGuy;
            return {
                description: "",
                execute: () => {
                    if (value === "none") {
                        p.setAnchorGuy(undefined);
                    } else {
                        p.setAnchorGuy({
                            type: value,
                            direction: p.anchorGuy?.direction ?? RelativeSidePosition.LEFT,
                        });
                    }
                },
                undo: () => p.setAnchorGuy(prev),
            };
        });
        this.undoStackStore.execute(new BatchCommand(`Изменена оттяжка для ${poles.length} опор`, commands));
    }

    // ── Bulk: анкерная оттяжка (направление — toggle) ─────────────────────

    toggleBulkAnchorGuyDirection(poles: CatenaryPole[]): void {
        const commands = poles
            .filter((p) => p.anchorGuy)
            .map((p) => {
                const prev = p.anchorGuy!;
                const newDir =
                    prev.direction === RelativeSidePosition.LEFT
                        ? RelativeSidePosition.RIGHT
                        : RelativeSidePosition.LEFT;
                return {
                    description: "",
                    execute: () => p.setAnchorGuy({ ...prev, direction: newDir }),
                    undo: () => p.setAnchorGuy(prev),
                };
            });
        if (commands.length > 0) {
            this.undoStackStore.execute(
                new BatchCommand(`Изменено направление оттяжки для ${commands.length} опор`, commands),
            );
        }
    }

    // ── Bulk: подкос ──────────────────────────────────────────────────────

    setBulkAnchorBrace(poles: CatenaryPole[], enabled: boolean): void {
        const commands = poles.map((p) => {
            const prev = p.anchorBrace;
            return {
                description: "",
                execute: () => p.setAnchorBrace(enabled ? { direction: RelativeSidePosition.RIGHT } : undefined),
                undo: () => p.setAnchorBrace(prev),
            };
        });
        this.undoStackStore.execute(new BatchCommand(`Изменён подкос для ${poles.length} опор`, commands));
    }

    // ── Bulk: заземление ──────────────────────────────────────────────────

    setBulkGrounding(poles: CatenaryPole[], value: GroundingType | "none"): void {
        const grounding = value === "none" ? undefined : value;
        const commands = poles.map((p) => {
            const prev = p.grounding;
            return {
                description: "",
                execute: () => p.setGrounding(grounding),
                undo: () => p.setGrounding(prev),
            };
        });
        this.undoStackStore.execute(new BatchCommand(`Изменено заземление для ${poles.length} опор`, commands));
    }

    // ── Bulk: габарит пути ────────────────────────────────────────────────

    setBulkTrackGabarit(poles: CatenaryPole[], trackId: string, value: number): void {
        const commands = poles
            .filter((p) => p.tracks[trackId])
            .map((p) => {
                const prev = p.tracks[trackId].gabarit;
                return {
                    description: "",
                    execute: () => p.setTrackGabarit(trackId, value),
                    undo: () => p.setTrackGabarit(trackId, prev),
                };
            });
        if (commands.length > 0) {
            this.undoStackStore.execute(new BatchCommand(`Изменён габарит для ${commands.length} опор`, commands));
        }
    }

    // ── Bulk: направление пути (toggle) ───────────────────────────────────

    toggleBulkTrackDirection(poles: CatenaryPole[], trackId: string): void {
        const commands = poles
            .filter((p) => p.tracks[trackId])
            .map((p) => {
                const prev = p.tracks[trackId].relativePositionToTrack;
                const next =
                    prev === RelativeSidePosition.LEFT ? RelativeSidePosition.RIGHT : RelativeSidePosition.LEFT;
                return {
                    description: "",
                    execute: () => p.setTrackDirection(trackId, next),
                    undo: () => p.setTrackDirection(trackId, prev),
                };
            });
        if (commands.length > 0) {
            this.undoStackStore.execute(
                new BatchCommand(`Изменено направление для ${commands.length} опор`, commands),
            );
        }
    }

    // ── Bulk: перенос привязки (путь X → путь Y) ──────────────────────────

    reassignBulkTrack(poles: CatenaryPole[], fromTrackId: string, toTrackId: string): void {
        const toTrack = this.tracksStore.tracks.get(toTrackId);
        if (!toTrack || fromTrackId === toTrackId) {
            return;
        }
        const commands = poles
            .filter((p) => p.tracks[fromTrackId] && !p.tracks[toTrackId])
            .map((p) => {
                const prev = { ...p.tracks };
                return {
                    description: "",
                    execute: () => p.replaceTrackBinding(fromTrackId, toTrack),
                    undo: () => p.setTracks(prev),
                };
            });
        if (commands.length > 0) {
            this.undoStackStore.execute(
                new BatchCommand(`Перенесена привязка для ${commands.length} опор`, commands),
            );
        }
    }

    // ── Bulk: добавление пути ──────────────────────────────────────────────

    addBulkTrack(poles: CatenaryPole[], trackId: string): void {
        const track = this.tracksStore.tracks.get(trackId);
        if (!track) {
            return;
        }
        const commands = poles
            .filter((p) => !p.tracks[trackId])
            .map((p) => {
                const prev = { ...p.tracks };
                return {
                    description: "",
                    execute: () => p.addTrackBinding(track),
                    undo: () => p.setTracks(prev),
                };
            });
        if (commands.length > 0) {
            this.undoStackStore.execute(new BatchCommand(`Добавлен путь для ${commands.length} опор`, commands));
        }
    }

    // ── Bulk: удаление пути ────────────────────────────────────────────────

    removeBulkTrack(poles: CatenaryPole[], trackId: string): void {
        const commands = poles
            // не удаляем единственную привязку — иначе Y опоры станет 0
            .filter((p) => p.tracks[trackId] && Object.keys(p.tracks).length > 1)
            .map((p) => {
                const prev = { ...p.tracks };
                return {
                    description: "",
                    execute: () => p.removeTrackBinding(trackId),
                    undo: () => p.setTracks(prev),
                };
            });
        if (commands.length > 0) {
            this.undoStackStore.execute(new BatchCommand(`Удалён путь для ${commands.length} опор`, commands));
        }
    }
}
