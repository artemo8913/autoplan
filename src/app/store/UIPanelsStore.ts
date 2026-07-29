import { makeAutoObservable } from "mobx";

export class UIPanelsStore {
    isOpenPoleEditorPanel = false;
    isOpenTracksEditorPanel = false;
    isOpenLinesEditorPanel = false;
    isOpenJunctionsEditorPanel = false;
    isBulkPolesModalOpen = false;

    constructor() {
        makeAutoObservable(this);
    }

    togglePoleEditorPanel() {
        this.isOpenPoleEditorPanel = !this.isOpenPoleEditorPanel;
    }

    openPoleEditorPanel() {
        this.isOpenPoleEditorPanel = true;
    }

    closePoleEditorPanel() {
        this.isOpenPoleEditorPanel = false;
    }

    toggleTracksEditorPanel() {
        this.isOpenTracksEditorPanel = !this.isOpenTracksEditorPanel;
    }

    toggleLinesEditorPanel() {
        this.isOpenLinesEditorPanel = !this.isOpenLinesEditorPanel;
    }

    toggleJunctionsEditorPanel() {
        this.isOpenJunctionsEditorPanel = !this.isOpenJunctionsEditorPanel;
    }

    toggleBulkPolesModal() { this.isBulkPolesModalOpen = !this.isBulkPolesModalOpen; }
    openBulkPolesModal()   { this.isBulkPolesModalOpen = true; }
    closeBulkPolesModal()  { this.isBulkPolesModalOpen = false; }
}
