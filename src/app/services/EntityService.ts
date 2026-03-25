import type { Pos } from "@/shared/types/catenaryTypes";
import type { PlaceableEntityConfig } from "@/shared/types/toolTypes";
import { CatenaryPole, VlPole, type PoleToTracksRelations } from "@/entities/catenaryPlanGraphic";

import type { SnapInfo, NearbyTrackSnap } from "./SnapService";
import type { PolesStore } from "../store/PolesStore";
import type { VlPolesStore } from "../store/VlPolesStore";
import type { TracksStore } from "../store/TracksStore";
import type { UndoStackStore } from "../store/UndoStackStore";

type CatenaryPoleConfig = Extract<PlaceableEntityConfig, { kind: "catenaryPole" }>;
type VlPoleConfig = Extract<PlaceableEntityConfig, { kind: "vlPole" }>;

export class EntityService {
    constructor(
        private readonly polesStore: PolesStore,
        private readonly vlPolesStore: VlPolesStore,
        private readonly tracksStore: TracksStore,
        private readonly undoStackStore: UndoStackStore,
    ) {}

    createEntity(pos: Pos, config: PlaceableEntityConfig, snap: SnapInfo | null): string | null {
        if (config.kind === "catenaryPole") {
            return this.createCatenaryPole(config, snap);
        }
        if (config.kind === "vlPole") {
            return this.createVlPole(pos, config);
        }
        return null;
    }

    createCatenaryPole(config: CatenaryPoleConfig, snap: SnapInfo | null): string | null {
        const relations = this._buildTrackRelations(snap?.nearbyTracks ?? []);
        if (!relations) {
            return null;
        }

        const primaryTrack = this.tracksStore.tracks.get(snap!.nearbyTracks![0].trackId)!;
        const name = this._autoNamePole(primaryTrack);

        const newPole = new CatenaryPole({
            x: snap!.snappedPos.x,
            name,
            material: config.material ?? "concrete",
            tracks: relations,
        });

        this.undoStackStore.execute({
            description: `Добавлена опора КС №${newPole.name}`,
            execute: () => {
                this.polesStore.poles.set(newPole.id, newPole);
            },
            undo: () => {
                this.polesStore.poles.delete(newPole.id);
            },
        });

        return newPole.id;
    }

    createVlPole(pos: Pos, config: VlPoleConfig): string | null {
        const newPole = new VlPole({
            x: pos.x,
            y: pos.y,
            name: `В${this.vlPolesStore.list.length + 1}`,
            vlType: config.vlType,
        });

        this.undoStackStore.execute({
            description: `Добавлена опора ВЛ ${newPole.name}`,
            execute: () => {
                this.vlPolesStore.vlPoles.set(newPole.id, newPole);
            },
            undo: () => {
                this.vlPolesStore.vlPoles.delete(newPole.id);
            },
        });

        return newPole.id;
    }

    deleteEntities(ids: string[]): void {
        const snapshots: Array<{ store: Map<string, unknown>; id: string; obj: unknown }> = [];

        for (const id of ids) {
            if (this.polesStore.poles.has(id)) {
                snapshots.push({
                    store: this.polesStore.poles as Map<string, unknown>,
                    id,
                    obj: this.polesStore.poles.get(id),
                });
            } else if (this.vlPolesStore.vlPoles.has(id)) {
                snapshots.push({
                    store: this.vlPolesStore.vlPoles as Map<string, unknown>,
                    id,
                    obj: this.vlPolesStore.vlPoles.get(id),
                });
            }
        }

        this.undoStackStore.execute({
            description: `Удалено объектов: ${snapshots.length}`,
            execute: () => {
                snapshots.forEach((s) => s.store.delete(s.id));
            },
            undo: () => {
                snapshots.forEach((s) => s.store.set(s.id, s.obj));
            },
        });
    }

    private _buildTrackRelations(nearbyTracks: NearbyTrackSnap[]): PoleToTracksRelations | null {
        if (!nearbyTracks.length) {
            return null;
        }

        const relations: PoleToTracksRelations = {};

        for (const nearbyTrack of nearbyTracks) {
            const track = this.tracksStore.tracks.get(nearbyTrack.trackId);
            if (!track) {
                continue;
            }
            relations[track.id] = {
                track,
                gabarit: Math.round(nearbyTrack.gabarit * 10) / 10,
                relativePositionToTrack: nearbyTrack.relativePositionToTrack,
            };
        }

        return Object.keys(relations).length > 0 ? relations : null;
    }

    // ── Drag ───────────────────────────────────────────────────────────────

    snapshotPositions(ids: string[]): Map<string, { x: number; y?: number }> {
        const positions = new Map<string, { x: number; y?: number }>();
        for (const id of ids) {
            const cp = this.polesStore.poles.get(id);
            if (cp) {
                positions.set(id, { x: cp.x });
                continue;
            }
            const vp = this.vlPolesStore.vlPoles.get(id);
            if (vp) {
                positions.set(id, { x: vp.x, y: vp.y });
            }
        }
        return positions;
    }

    updateDrag(originalPositions: Map<string, { x: number; y?: number }>, dx: number, dy: number): void {
        for (const [id, orig] of originalPositions) {
            const newX = Math.round(orig.x + dx);

            const cp = this.polesStore.poles.get(id);
            if (cp) {
                cp.setX(newX);
                continue;
            }
            const vp = this.vlPolesStore.vlPoles.get(id);
            if (vp) {
                vp.x = newX;
                vp.y = (orig.y ?? 0) + dy;
            }
        }
    }

    commitDrag(originalPositions: Map<string, { x: number; y?: number }>): void {
        const finalPositions = new Map<string, { x: number; y?: number }>();
        for (const [id] of originalPositions) {
            const cp = this.polesStore.poles.get(id);
            if (cp) {
                finalPositions.set(id, { x: cp.x });
                continue;
            }
            const vp = this.vlPolesStore.vlPoles.get(id);
            if (vp) {
                finalPositions.set(id, { x: vp.x, y: vp.y });
            }
        }

        this.undoStackStore.execute({
            description: `Перемещено объектов: ${originalPositions.size}`,
            execute: () => this._applyPositions(finalPositions),
            undo: () => this._applyPositions(originalPositions),
        });
    }

    cancelDrag(originalPositions: Map<string, { x: number; y?: number }>): void {
        this._applyPositions(originalPositions);
    }

    private _applyPositions(positions: Map<string, { x: number; y?: number }>): void {
        for (const [id, pos] of positions) {
            const cp = this.polesStore.poles.get(id);
            if (cp) {
                cp.setX(pos.x);
                continue;
            }
            const vp = this.vlPolesStore.vlPoles.get(id);
            if (vp) {
                vp.x = pos.x;
                if (pos.y !== undefined) {
                    vp.y = pos.y;
                }
            }
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────

    private _autoNamePole(primaryTrack: { directionMultiplier: number }): string {
        const isEven = primaryTrack.directionMultiplier === 1;
        const sameDirectionCount = this.polesStore.list.filter((p) => {
            const t = Object.values(p.tracks)[0]?.track;
            return t?.directionMultiplier === primaryTrack.directionMultiplier;
        }).length;
        return "б/н" + String((isEven ? 2 : 1) + sameDirectionCount * 2);
    }
}
