import { makeAutoObservable } from "mobx";

import { Track, type RailwayTrackConstructorParams, type Railway } from "@/entities/catenaryPlanGraphic";

export class TracksStore {
    tracks: Map<string, Track>;
    private _railway: Railway;

    get list(): Track[] {
        return [...this.tracks.values()];
    }

    get railway(): Railway {
        return this._railway;
    }

    loadFrom(tracks: Track[], railway: Railway): void {
        this._railway = railway;
        this.tracks = new Map(tracks.map(t => [t.id, t]));
    }

    constructor(tracks: Track[], railway: Railway) {
        this.tracks = new Map(tracks.map((t) => [t.id, t]));
        this._railway = railway;
        makeAutoObservable(this);
    }

    addTrack(params: Omit<RailwayTrackConstructorParams, "railway">): Track {
        const track = new Track({ ...params, railway: this._railway });
        this.tracks.set(track.id, track);
        return track;
    }

    removeTrack(id: string): void {
        this.tracks.delete(id);
    }
}
