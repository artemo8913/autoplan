import type { Picketage } from "@/shared/types/catenaryTypes";
import type { Railway, Track } from "@/entities/catenaryPlanGraphic";
import { Track as TrackClass } from "@/entities/catenaryPlanGraphic";

import type { PlanEntityStores } from "../types";
import type { UndoStackStore } from "../store/UndoStackStore";
import { BatchCommand } from "../store/UndoStackStore";
import { planDeletion } from "./cascadeRules";
import type { TrackDetachImpact } from "./deletionMessages";

/** Единственный вход для правок путей и участка: каждый метод = команда в undo-стеке. */
export class TrackService {
    constructor(
        private readonly stores: PlanEntityStores,
        private readonly undoStackStore: UndoStackStore,
    ) {}

    private get _railway(): Railway {
        return this.stores.tracksStore.railway;
    }

    // ── Пути ──────────────────────────────────────────────────────────────

    createTrack(): Track {
        const { tracksStore } = this.stores;
        const track = new TrackClass({
            railway: tracksStore.railway,
            name: `${tracksStore.tracks.size + 1}`,
            yOffsetMeters: tracksStore.nextDefaultYOffset,
            startX: tracksStore.railway.startX,
            endX: tracksStore.railway.endX,
        });

        this.undoStackStore.execute({
            description: `Добавлен путь ${track.name}`,
            execute: () => tracksStore.add(track),
            undo: () => tracksStore.remove(track.id),
        });

        return track;
    }

    /** Удаление пути: сам путь + отвязка опор и ТФ от него (см. cascadeRules). */
    deleteTrack(track: Track): void {
        const { ops } = planDeletion([track.id], this.stores);
        this.undoStackStore.execute(new BatchCommand(`Удалён путь ${track.name}`, ops));
    }

    /**
     * Что потеряет привязку при удалении пути: сами опоры и ТФ остаются,
     * но перестают быть привязанными (см. cascadeRules). Нужно для подтверждения.
     */
    getDeleteImpact(trackId: string): TrackDetachImpact {
        return {
            poles: this.stores.catenaryPoleStore.list.filter((p) => p.hasTrack(trackId)).length,
            fixingPoints: this.stores.fixingPointsStore.list.filter((fp) => fp.track?.id === trackId).length,
        };
    }

    setTrackName(track: Track, name: string): void {
        const prev = track.name;
        this.undoStackStore.execute(
            {
                description: `Наименование пути: «${prev}» → «${name}»`,
                execute: () => track.setName(name),
                undo: () => track.setName(prev),
            },
            `track.name:${track.id}`,
        );
    }

    setTrackYOffset(track: Track, meters: number): void {
        const prev = track.yOffsetMeters;
        this.undoStackStore.execute(
            {
                description: `Смещение пути ${track.name}: ${prev} → ${meters} м`,
                execute: () => track.setYOffsetMeters(meters),
                undo: () => track.setYOffsetMeters(prev),
            },
            `track.yOffset:${track.id}`,
        );
    }

    setTrackStartX(track: Track, x: number): void {
        const prev = track.startX;
        this.undoStackStore.execute(
            {
                description: `Начало пути ${track.name}`,
                execute: () => track.setStartX(x),
                undo: () => track.setStartX(prev),
            },
            `track.startX:${track.id}`,
        );
    }

    setTrackEndX(track: Track, x: number): void {
        const prev = track.endX;
        this.undoStackStore.execute(
            {
                description: `Конец пути ${track.name}`,
                execute: () => track.setEndX(x),
                undo: () => track.setEndX(prev),
            },
            `track.endX:${track.id}`,
        );
    }

    // ── Участок ───────────────────────────────────────────────────────────

    setRailwayName(name: string): void {
        const railway = this._railway;
        const prev = railway.name;
        this.undoStackStore.execute(
            {
                description: `Название участка: «${prev}» → «${name}»`,
                execute: () => railway.setName(name),
                undo: () => railway.setName(prev),
            },
            `railway.name:${railway.id}`,
        );
    }

    setRailwayStartX(x: number): void {
        const railway = this._railway;
        const prev = railway.startX;
        this.undoStackStore.execute(
            {
                description: "Начало участка",
                execute: () => railway.setStartX(x),
                undo: () => railway.setStartX(prev),
            },
            `railway.startX:${railway.id}`,
        );
    }

    setRailwayEndX(x: number): void {
        const railway = this._railway;
        const prev = railway.endX;
        this.undoStackStore.execute(
            {
                description: "Конец участка",
                execute: () => railway.setEndX(x),
                undo: () => railway.setEndX(prev),
            },
            `railway.endX:${railway.id}`,
        );
    }

    /**
     * Пикетаж (рубленые км) правится целиком: панель считает новое значение
     * чистыми трансформами из shared/lib/picketageOps и отдаёт его сюда.
     * `mergeKey` склеивает серию правок одного поля в одну запись undo-стека.
     */
    setPicketage(picketage: Picketage, description: string, mergeKey?: string): void {
        const railway = this._railway;
        const prev = railway.picketage;

        this.undoStackStore.execute(
            {
                description,
                execute: () => railway.setPicketage(picketage),
                undo: () => railway.setPicketage(prev),
            },
            mergeKey ? `railway.picketage:${mergeKey}` : undefined,
        );
    }
}
