import type { NearbyTrackSnap, PlaceableEntityConfig, SnapInfo } from "@/shared/types/toolTypes";
import type { Pos, RelativeSidePosition, DisconnectorControlType } from "@/shared/types/catenaryTypes";
import {
    CatenaryPole,
    CrossSpan,
    VlPole,
    Disconnector,
    type PoleToTracksRelations,
} from "@/entities/catenaryPlanGraphic";

import type { PlanEntityStores } from "../types";
import type { UndoStackStore } from "../store/UndoStackStore";
import { BatchCommand } from "../store/UndoStackStore";
import { planDeletion, type DeletionCounts } from "./cascadeRules";

type CatenaryPoleConfig = Extract<PlaceableEntityConfig, { kind: "catenaryPole" }>;
type VlPoleConfig = Extract<PlaceableEntityConfig, { kind: "vlPole" }>;

export class EntityService {
    constructor(
        private readonly stores: PlanEntityStores,
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

        const primaryTrack = this.stores.tracksStore.tracks.get(snap!.nearbyTracks![0].trackId)!;
        const name = this._autoNamePole(primaryTrack);

        const newPole = new CatenaryPole({
            x: snap!.snappedPos.x,
            name,
            material: config.material ?? "concrete",
            tracks: relations,
        });

        this.undoStackStore.execute({
            description: `Добавлена опора КС №${newPole.name}`,
            execute: () => this.stores.catenaryPoleStore.add(newPole),
            undo: () => this.stores.catenaryPoleStore.remove(newPole.id),
        });

        return newPole.id;
    }

    createVlPole(pos: Pos, config: VlPoleConfig): string | null {
        const newPole = new VlPole({
            x: pos.x,
            y: pos.y,
            name: `В${this.stores.vlPolesStore.vlPoles.size + 1}`,
            vlType: config.vlType,
        });

        this.undoStackStore.execute({
            description: `Добавлена опора ВЛ ${newPole.name}`,
            execute: () => this.stores.vlPolesStore.add(newPole),
            undo: () => this.stores.vlPolesStore.remove(newPole.id),
        });

        return newPole.id;
    }

    createCrossSpan(spanType: "flexible" | "rigid", poleAId: string, poleBId: string): string | null {
        const poleA = this.stores.catenaryPoleStore.poles.get(poleAId);
        const poleB = this.stores.catenaryPoleStore.poles.get(poleBId);
        if (!poleA || !poleB) {
            return null;
        }

        const crossSpan = new CrossSpan({ spanType, poleA, poleB });

        this.undoStackStore.execute({
            description: `Добавлена ${spanType === "flexible" ? "гибкая" : "жёсткая"} поперечина`,
            execute: () => this.stores.crossSpansStore.add(crossSpan),
            undo: () => this.stores.crossSpansStore.remove(crossSpan.id),
        });

        return crossSpan.id;
    }

    createDisconnector(
        poleId: string,
        config: { controlType: DisconnectorControlType; phaseCount: 1 | 2 | 3 },
        yOffset: number,
    ): string | null {
        const pole = this.stores.catenaryPoleStore.poles.get(poleId);
        if (!pole) {
            return null;
        }

        const name = `Р${this.stores.disconnectorsStore.disconnectors.size + 1}`;
        const disconnector = new Disconnector({
            name,
            pole,
            controlType: config.controlType,
            state: "off",
            phaseCount: config.phaseCount,
            yOffset,
        });

        this.undoStackStore.execute({
            description: `Добавлен разъединитель ${disconnector.name}`,
            execute: () => this.stores.disconnectorsStore.add(disconnector),
            undo: () => this.stores.disconnectorsStore.remove(disconnector.id),
        });

        return disconnector.id;
    }

    bulkCreateCatenaryPoles(
        rows: Array<{
            name: string;
            x: number;
            trackId: string;
            gabarit: number;
            side: RelativeSidePosition;
        }>,
    ): void {
        if (rows.length === 0) {
            return;
        }

        const commands = rows.map((row) => {
            const track = this.stores.tracksStore.tracks.get(row.trackId)!;
            const pole = new CatenaryPole({
                x: row.x,
                name: row.name,
                material: "concrete",
                tracks: {
                    [track.id]: { track, gabarit: row.gabarit, relativePositionToTrack: row.side },
                },
            });
            return {
                execute: () => this.stores.catenaryPoleStore.add(pole),
                undo: () => this.stores.catenaryPoleStore.remove(pole.id),
            };
        });

        this.undoStackStore.execute(new BatchCommand(`Массовое добавление опор: ${rows.length} шт.`, commands));
    }

    /** Что уйдёт вместе с выделением — для подтверждения удаления. */
    getDeletePreview(ids: string[]): DeletionCounts {
        return planDeletion(ids, this.stores).counts;
    }

    /** Удаление произвольного набора сущностей; каскад описан в cascadeRules. */
    deleteEntities(ids: string[]): void {
        const { ops } = planDeletion(ids, this.stores);
        if (ops.length === 0) {
            return;
        }

        this.undoStackStore.execute(new BatchCommand(`Удалено объектов: ${ids.length}`, ops));
    }

    private _buildTrackRelations(nearbyTracks: NearbyTrackSnap[]): PoleToTracksRelations | null {
        if (!nearbyTracks.length) {
            return null;
        }

        const relations: PoleToTracksRelations = {};

        for (const nearbyTrack of nearbyTracks) {
            const track = this.stores.tracksStore.tracks.get(nearbyTrack.trackId);
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

    // ── Private helpers ───────────────────────────────────────────────────

    private _autoNamePole(primaryTrack: { directionMultiplier: number }): string {
        const isEven = primaryTrack.directionMultiplier === 1;
        const sameDirectionCount = this.stores.catenaryPoleStore.list.filter((p) => {
            const t = Object.values(p.tracks)[0]?.track;
            return t?.directionMultiplier === primaryTrack.directionMultiplier;
        }).length;
        return "б/н" + String((isEven ? 2 : 1) + sameDirectionCount * 2);
    }
}
