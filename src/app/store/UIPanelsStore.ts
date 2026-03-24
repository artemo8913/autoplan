import { makeAutoObservable } from "mobx";

export class UIPanelsStore {
    isOpenPoleEditorPanel = false;
    isOpenTracksEditorPanel = false;
    isOpenLinesEditorPanel = false;

    constructor() {
        makeAutoObservable(this);
    }

    togglePoleEditorPanel() {
        this.isOpenPoleEditorPanel = !this.isOpenPoleEditorPanel;
    }

    toggleTracksEditorPanel() {
        this.isOpenTracksEditorPanel = !this.isOpenTracksEditorPanel;
    }

    toggleLinesEditorPanel() {
        this.isOpenLinesEditorPanel = !this.isOpenLinesEditorPanel;
    }
}
