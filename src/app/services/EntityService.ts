import type { Pos, RelativeSidePosition } from "@/shared/types/catenaryTypes";
import type { NearbyTrackSnap, PlaceableEntityConfig, SnapInfo } from "@/shared/types/toolTypes";
import {
    CatenaryPole,
    CrossSpan,
    VlPole,
    Disconnector,
    type PoleToTracksRelations,
} from "@/entities/catenaryPlanGraphic";
import { BatchCommand } from "../store/UndoStackStore";

import type { PolesStore } from "../store/PolesStore";
import type { VlPolesStore } from "../store/VlPolesStore";
import type { TracksStore } from "../store/TracksStore";
import type { UndoStackStore } from "../store/UndoStackStore";
import type { CrossSpansStore } from "../store/CrossSpansStore";
import type { DisconnectorsStore } from "../store/DisconnectorsStore";
import type { HitTestService } from "./HitTestService";
import type { DisconnectorControlType } from "@/shared/types/catenaryTypes";

type CatenaryPoleConfig = Extract<PlaceableEntityConfig, { kind: "catenaryPole" }>;
type VlPoleConfig = Extract<PlaceableEntityConfig, { kind: "vlPole" }>;
type DisconnectorConfig = Extract<PlaceableEntityConfig, { kind: "disconnector" }>;

export class EntityService {
    constructor(
        private readonly polesStore: PolesStore,
        private readonly vlPolesStore: VlPolesStore,
        private readonly tracksStore: TracksStore,
        private readonly undoStackStore: UndoStackStore,
        private readonly crossSpansStore: CrossSpansStore,
        private readonly disconnectorsStore: DisconnectorsStore,
        private readonly hitTestService: HitTestService,
    ) {}

    createEntity(pos: Pos, config: PlaceableEntityConfig, snap: SnapInfo | null): string | null {
        if (config.kind === "catenaryPole") {
            return this.createCatenaryPole(config, snap);
        }
        if (config.kind === "vlPole") {
            return this.createVlPole(pos, config);
        }
        if (config.kind === "disconnector") {
            return this._createDisconnectorAtPos(pos, config);
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
            execute: () => this.polesStore.add(newPole),
            undo: () => this.polesStore.remove(newPole.id),
        });

        return newPole.id;
    }

    createVlPole(pos: Pos, config: VlPoleConfig): string | null {
        const newPole = new VlPole({
            x: pos.x,
            y: pos.y,
            name: `В${this.vlPolesStore.vlPoles.size + 1}`,
            vlType: config.vlType,
        });

        this.undoStackStore.execute({
            description: `Добавлена опора ВЛ ${newPole.name}`,
            execute: () => this.vlPolesStore.add(newPole),
            undo: () => this.vlPolesStore.remove(newPole.id),
        });

        return newPole.id;
    }

    createCrossSpan(spanType: "flexible" | "rigid", poleAId: string, poleBId: string): string | null {
        const poleA = this.polesStore.poles.get(poleAId);
        const poleB = this.polesStore.poles.get(poleBId);
        if (!poleA || !poleB) {
            return null;
        }

        const crossSpan = new CrossSpan({ spanType, poleA, poleB });

        this.undoStackStore.execute({
            description: `Добавлена ${spanType === "flexible" ? "гибкая" : "жёсткая"} поперечина`,
            execute: () => this.crossSpansStore.add(crossSpan),
            undo: () => this.crossSpansStore.remove(crossSpan.id),
        });

        return crossSpan.id;
    }

    createDisconnector(
        poleId: string,
        config: { controlType: DisconnectorControlType; phaseCount: 1 | 2 | 3 },
        yOffset: number,
    ): string | null {
        const pole = this.polesStore.poles.get(poleId);
        if (!pole) {
            return null;
        }

        const name = `Р${this.disconnectorsStore.disconnectors.size + 1}`;
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
            execute: () => this.disconnectorsStore.add(disconnector),
            undo: () => this.disconnectorsStore.remove(disconnector.id),
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
        if (rows.length === 0) return;

        const commands = rows.map((row) => {
            const track = this.tracksStore.tracks.get(row.trackId)!;
            const pole = new CatenaryPole({
                x: row.x,
                name: row.name,
                material: "concrete",
                tracks: {
                    [track.id]: { track, gabarit: row.gabarit, relativePositionToTrack: row.side },
                },
            });
            return {
                description: `Опора ${pole.name}`,
                execute: () => this.polesStore.add(pole),
                undo: () => this.polesStore.remove(pole.id),
            };
        });

        this.undoStackStore.execute(new BatchCommand(`Массовое добавление опор: ${rows.length} шт.`, commands));
    }

    deleteEntities(ids: string[]): void {
        const ops: Array<{ execute(): void; undo(): void }> = [];

        for (const id of ids) {
            const pole = this.polesStore.poles.get(id);
            if (pole) {
                ops.push({ execute: () => this.polesStore.remove(id), undo: () => this.polesStore.add(pole) });
                continue;
            }
            const vlPole = this.vlPolesStore.vlPoles.get(id);
            if (vlPole) {
                ops.push({ execute: () => this.vlPolesStore.remove(id), undo: () => this.vlPolesStore.add(vlPole) });
                continue;
            }
            const crossSpan = this.crossSpansStore.crossSpans.get(id);
            if (crossSpan) {
                ops.push({ execute: () => this.crossSpansStore.remove(id), undo: () => this.crossSpansStore.add(crossSpan) });
                continue;
            }
            const disconnector = this.disconnectorsStore.disconnectors.get(id);
            if (disconnector) {
                ops.push({ execute: () => this.disconnectorsStore.remove(id), undo: () => this.disconnectorsStore.add(disconnector) });
            }
        }

        this.undoStackStore.execute({
            description: `Удалено объектов: ${ops.length}`,
            execute: () => ops.forEach((op) => op.execute()),
            undo: () => [...ops].reverse().forEach((op) => op.undo()),
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

    private _createDisconnectorAtPos(pos: Pos, config: DisconnectorConfig): string | null {
        const closest = this.hitTestService.findClosestCatenaryPole(pos);
        if (!closest) {
            return null;
        }
        return this.createDisconnector(
            closest.id,
            { controlType: config.controlType, phaseCount: config.phaseCount },
            closest.yOffset,
        );
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
