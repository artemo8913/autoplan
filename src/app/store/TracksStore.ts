import { makeAutoObservable } from "mobx";

import { Track, type Railway } from "@/entities/catenaryPlanGraphic";

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

    private _calcDefaultOffset(): number {
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

    createNewTrack(): Track {
        const track = new Track({
            railway: this._railway,
            name: `Путь №${this.tracks.size + 1}`,
            yOffsetMeters: this._calcDefaultOffset(),
            startX: this._railway.startX,
            endX: this._railway.endX,
        });

        this.tracks.set(track.id, track);

        return track;
    }

    remove(id: string): void {
        this.tracks.delete(id);
    }
}
