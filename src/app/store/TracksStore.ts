import { makeAutoObservable } from "mobx";

import type { Track } from "@/entities/catenaryPlanGraphic";

export class TracksStore {
    tracks: Map<string, Track>;
    
    get list(): Track[] {
        return [...this.tracks.values()];
    }
    
    constructor(tracks: Track[]) {
        this.tracks = new Map(tracks.map(t => [t.id, t]));
        makeAutoObservable(this);
    }
}
