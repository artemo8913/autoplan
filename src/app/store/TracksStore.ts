import { makeAutoObservable } from "mobx";

import type { Track, Railway } from "@/entities/catenaryPlanGraphic";

const NEW_TRACK_OFFSET_STEP = 5;

export class TracksStore {
    tracks: Map<string, Track>;
    private _railway: Railway;

    get list(): Track[] {
        return [...this.tracks.values()];
    }

    get railway(): Railway {
        return this._railway;
    }

    /** Смещение по умолчанию для следующего пути — на шаг дальше самого удалённого от оси. */
    get nextDefaultYOffset(): number {
        const tracks = this.list;

        if (tracks.length === 0) {
            return NEW_TRACK_OFFSET_STEP;
        }

        const furthestTrack = tracks.reduce((a, b) => (Math.abs(a.yOffsetMeters) >= Math.abs(b.yOffsetMeters) ? a : b));
        const sign = Math.sign(furthestTrack.yOffsetMeters);

        return furthestTrack.yOffsetMeters + sign * NEW_TRACK_OFFSET_STEP;
    }

    loadFrom(tracks: Track[], railway: Railway): void {
        this._railway = railway;
        this.tracks = new Map(tracks.map((t) => [t.id, t]));
    }

    constructor(tracks: Track[], railway: Railway) {
        this.tracks = new Map(tracks.map((t) => [t.id, t]));
        this._railway = railway;
        makeAutoObservable(this);
    }

    add(track: Track): void {
        this.tracks.set(track.id, track);
    }

    remove(id: string): void {
        this.tracks.delete(id);
    }
}
