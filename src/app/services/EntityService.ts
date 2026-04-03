import type { Pos, RelativeSidePosition } from "@/shared/types/catenaryTypes";
import type { NearbyTrackSnap, PlaceableEntityConfig, SnapInfo } from "@/shared/types/toolTypes";
import {
    CatenaryPole,
    VlPole,
    FlexibleCrossSpan,
    RigidCrossSpan,
    Disconnector,
    type PoleToTracksRelations,
} from "@/entities/catenaryPlanGraphic";
import { BatchCommand } from "../store/UndoStackStore";

import type { PolesStore } from "../store/PolesStore";
import type { VlPolesStore } from "../store/VlPolesStore";
import type { TracksStore } from "../store/TracksStore";
import type { UndoStackStore } from "../store/UndoStackStore";
import type { FixingPointsStore } from "../store/FixingPointsStore";
import type { CrossSpansStore } from "../store/CrossSpansStore";
import type { DisconnectorsStore } from "../store/DisconnectorsStore";
import type { DisconnectorControlType } from "@/shared/types/catenaryTypes";

type CatenaryPoleConfig = Extract<PlaceableEntityConfig, { kind: "catenaryPole" }>;
type VlPoleConfig = Extract<PlaceableEntityConfig, { kind: "vlPole" }>;
type DisconnectorConfig = Extract<PlaceableEntityConfig, { kind: "disconnector" }>;

export class EntityService {
    constructor(
        private readonly polesStore: PolesStore,
        private readonly vlPolesStore: VlPolesStore,
        private readonly tracksStore: TracksStore,
        private readonly fixingPointsStore: FixingPointsStore,
        private readonly undoStackStore: UndoStackStore,
        private readonly crossSpansStore: CrossSpansStore,
        private readonly disconnectorsStore: DisconnectorsStore,
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
            name: `В${this.vlPolesStore.poles.size + 1}`,
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

    createCrossSpan(spanType: "flexible" | "rigid", poleAId: string, poleBId: string): string | null {
        const poleA = this.polesStore.poles.get(poleAId);
        const poleB = this.polesStore.poles.get(poleBId);
        if (!poleA || !poleB) {
            return null;
        }

        const crossSpan =
            spanType === "flexible" ? new FlexibleCrossSpan({ poleA, poleB }) : new RigidCrossSpan({ poleA, poleB });

        this.undoStackStore.execute({
            description: `Добавлена ${spanType === "flexible" ? "гибкая" : "жёсткая"} поперечина`,
            execute: () => this.crossSpansStore.add(crossSpan),
            undo: () => this.crossSpansStore.delete(crossSpan.id),
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
            undo: () => this.disconnectorsStore.delete(disconnector.id),
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
                execute: () => {
                    this.polesStore.poles.set(pole.id, pole);
                },
                undo: () => {
                    this.polesStore.poles.delete(pole.id);
                },
            };
        });

        this.undoStackStore.execute(new BatchCommand(`Массовое добавление опор: ${rows.length} шт.`, commands));
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
            } else if (this.crossSpansStore.crossSpans.has(id)) {
                snapshots.push({
                    store: this.crossSpansStore.crossSpans as Map<string, unknown>,
                    id,
                    obj: this.crossSpansStore.crossSpans.get(id),
                });
            } else if (this.disconnectorsStore.disconnectors.has(id)) {
                snapshots.push({
                    store: this.disconnectorsStore.disconnectors as Map<string, unknown>,
                    id,
                    obj: this.disconnectorsStore.disconnectors.get(id),
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

    // ── Inline edit ─────────────────────────────────────────────────────

    renamePole(poleId: string, newName: string): void {
        const pole = this.polesStore.poles.get(poleId);
        if (!pole) {
            return;
        }

        const oldName = pole.name;
        this.undoStackStore.execute({
            description: `Переименование опоры: ${oldName} → ${newName}`,
            execute: () => pole.setName(newName),
            undo: () => pole.setName(oldName),
        });
    }

    setFixingPointZigzag(fpId: string, newValue: number | undefined): void {
        const fp = this.fixingPointsStore.fixingPoints.get(fpId);

        if (!fp) {
            return;
        }

        const oldValue = fp.zigzagValue;
        this.undoStackStore.execute({
            description: `Изменение зигзага: ${oldValue ?? "—"} → ${newValue ?? "—"}`,
            execute: () => fp.setZigzagValue(newValue),
            undo: () => fp.setZigzagValue(oldValue),
        });
    }

    // ── Span length ────────────────────────────────────────────────────

    setSpanLength(leftFpId: string, rightFpId: string, trackId: string, newLength: number, shiftChain: boolean): void {
        const leftFp = this.fixingPointsStore.fixingPoints.get(leftFpId);
        const rightFp = this.fixingPointsStore.fixingPoints.get(rightFpId);

        if (!leftFp || !rightFp) {
            return;
        }

        const leftPole = leftFp.pole;
        const rightPole = rightFp.pole;
        const direction = Math.sign(rightPole.x - leftPole.x) || 1;
        const targetX = Math.round(leftPole.x + direction * newLength);
        const delta = targetX - rightPole.x;

        if (delta === 0) {
            return;
        }

        const oldSpan = Math.abs(rightPole.x - leftPole.x);

        if (shiftChain) {
            const snapshots = new Map<string, number>();

            for (const pole of this.polesStore.list) {
                if (pole.tracks[trackId] && pole.x >= rightPole.x) {
                    snapshots.set(pole.id, pole.x);
                }
            }

            this.undoStackStore.execute({
                description: `Длина пролёта (цепочка): ${oldSpan} → ${newLength}`,
                execute: () => {
                    for (const [id, origX] of snapshots) {
                        this.polesStore.poles.get(id)?.setX(origX + delta);
                    }
                },
                undo: () => {
                    for (const [id, origX] of snapshots) {
                        this.polesStore.poles.get(id)?.setX(origX);
                    }
                },
            });
        } else {
            const rightCp = this.polesStore.poles.get(rightPole.id);
            if (!rightCp) {
                return;
            }

            const oldX = rightCp.x;
            this.undoStackStore.execute({
                description: `Длина пролёта: ${oldSpan} → ${newLength}`,
                execute: () => rightCp.setX(targetX),
                undo: () => rightCp.setX(oldX),
            });
        }
    }

    private _createDisconnectorAtPos(pos: Pos, config: DisconnectorConfig): string | null {
        // Найти ближайшую опору КС
        let closestPole: { id: string; dist: number } | null = null;
        for (const [id, pole] of this.polesStore.poles) {
            const dx = pole.pos.x - pos.x;
            const dy = pole.pos.y - pos.y;
            const dist = dx * dx + dy * dy;
            if (!closestPole || dist < closestPole.dist) {
                closestPole = { id, dist };
            }
        }
        if (!closestPole) {
            return null;
        }
        const pole = this.polesStore.poles.get(closestPole.id)!;
        const yOffset = pos.y - pole.pos.y;
        return this.createDisconnector(
            pole.id,
            { controlType: config.controlType, phaseCount: config.phaseCount },
            yOffset,
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
