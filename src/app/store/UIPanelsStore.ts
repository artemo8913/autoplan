import { makeAutoObservable } from "mobx";

export class UIPanelsStore {
    isOpenPoleEditorPanel = false;
    isOpenTracksEditorPanel = false;

    constructor() {
        makeAutoObservable(this);
    }

    togglePoleEditorPanel() {
        this.isOpenPoleEditorPanel = !this.isOpenPoleEditorPanel;
    }

    toggleTracksEditorPanel() {
        this.isOpenTracksEditorPanel = !this.isOpenTracksEditorPanel;
    }
}
