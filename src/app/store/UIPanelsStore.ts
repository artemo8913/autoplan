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

    openTracksEditorPanel() {
        this.isOpenTracksEditorPanel = true;
    }

    toggleLinesEditorPanel() {
        this.isOpenLinesEditorPanel = !this.isOpenLinesEditorPanel;
    }

    openLinesEditorPanel() {
        this.isOpenLinesEditorPanel = true;
    }

    toggleJunctionsEditorPanel() {
        this.isOpenJunctionsEditorPanel = !this.isOpenJunctionsEditorPanel;
    }

    openJunctionsEditorPanel() {
        this.isOpenJunctionsEditorPanel = true;
    }

    toggleBulkPolesModal() { this.isBulkPolesModalOpen = !this.isBulkPolesModalOpen; }
    openBulkPolesModal()   { this.isBulkPolesModalOpen = true; }
    closeBulkPolesModal()  { this.isBulkPolesModalOpen = false; }
}
