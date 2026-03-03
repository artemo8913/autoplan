import { makeAutoObservable } from "mobx";

import type { Railway } from "@/entities/lib/Railway";
import type { Track } from "@/entities/lib/Track";
import type { Pole } from "@/entities/lib/Pole";
import type { Attachment } from "@/entities/lib/Attachment";
import type { AnchorSection } from "@/entities/lib/AnchorSection";

interface ProjectStoreParams {
    railway: Railway;
    tracks: Track[];
    poles: Pole[];
    attachments: Attachment[];
    anchorSections: AnchorSection[];
}

export class ProjectStore {
    railway: Railway;
    tracks: Track[];
    poles: Pole[];
    attachments: Attachment[];
    anchorSections: AnchorSection[];
    selectedPoleId: string | null = null;

    constructor(params: ProjectStoreParams) {
        this.railway = params.railway;
        this.tracks = params.tracks;
        this.poles = params.poles;
        this.attachments = params.attachments;
        this.anchorSections = params.anchorSections;
        makeAutoObservable(this);
    }

    selectPole(id: string) {
        this.selectedPoleId = id;
    }

    deselectPole() {
        this.selectedPoleId = null;
    }

    get selectedPole(): Pole | null {
        return this.poles.find(p => p.id === this.selectedPoleId) ?? null;
    }
}
