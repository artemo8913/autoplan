import type { Pos, RelativeSidePosition } from "@/shared/types/catenaryTypes";
import type { SnapInfo } from "./SnapService";
import { CatenaryPole, VlPole } from "@/entities/catenaryPlanGraphic";

import type { PlaceableEntityConfig } from "@/shared/types/toolTypes";

import type { PolesStore } from "../store/PolesStore";
import type { VlPolesStore } from "../store/VlPolesStore";
import type { TracksStore } from "../store/TracksStore";
import type { UndoStackStore } from "../store/UndoStackStore";

// SVG-единиц на 1 метр габарита
const CATENARY_POLE_SCALE_Y = 10;
const CATENARY_POLE_DEFAULT_RADIUS = 20;
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
            return this.createCatenaryPole(pos, config, snap);
        }
        if (config.kind === "vlPole") {
            return this.createVlPole(pos, config, snap);
        }
        return null;
    }

    createCatenaryPole(pos: Pos, config: CatenaryPoleConfig, snap: SnapInfo | null): string | null {
        const trackId = snap?.trackId;
        const track = trackId ? this.tracksStore.tracks.get(trackId) : null;
        if (!track) {
            return null;
        }

        const trackPos = track.getPositionAtX(pos.x);
        const deltaY = pos.y - trackPos.y;
        const sign = deltaY >= 0 ? 1 : -1;
        const relativePos = (sign * track.directionMultiplier) as RelativeSidePosition;
        const absGaugeSvg = Math.abs(deltaY);
        const gabarit = Math.max(0, (absGaugeSvg - CATENARY_POLE_DEFAULT_RADIUS) / CATENARY_POLE_SCALE_Y);

        // Нумерация: чётные пути (directionMultiplier=1) → чётные номера (2,4,6...)
        //           нечётные (directionMultiplier=-1) → нечётные номера (1,3,5...)
        const isEven = track.directionMultiplier === 1;
        const sameDirectionCount = this.polesStore.list.filter((p) => {
            const t = Object.values(p.tracks)[0]?.track;
            return t?.directionMultiplier === track.directionMultiplier;
        }).length;
        const autoName = String((isEven ? 2 : 1) + sameDirectionCount * 2);

        const newPole = new CatenaryPole({
            x: pos.x,
            name: autoName,
            material: config.material ?? "concrete",
            tracks: {
                [track.id]: {
                    track,
                    gabarit: Math.round(gabarit * 10) / 10,
                    relativePositionToTrack: relativePos,
                },
            },
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    createVlPole(pos: Pos, config: VlPoleConfig, _snap: SnapInfo | null): string | null {
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
}
