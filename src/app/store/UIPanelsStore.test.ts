import { describe, it, expect } from "vitest";

import { UIPanelsStore } from "./UIPanelsStore";

describe("UIPanelsStore", () => {
    it("все панели изначально закрыты", () => {
        const s = new UIPanelsStore();
        expect(s.isOpenPoleEditorPanel).toBe(false);
        expect(s.isOpenTracksEditorPanel).toBe(false);
        expect(s.isOpenLinesEditorPanel).toBe(false);
        expect(s.isOpenJunctionsEditorPanel).toBe(false);
        expect(s.isBulkPolesModalOpen).toBe(false);
    });

    it("PoleEditorPanel: toggle / open / close", () => {
        const s = new UIPanelsStore();
        s.togglePoleEditorPanel();
        expect(s.isOpenPoleEditorPanel).toBe(true);
        s.togglePoleEditorPanel();
        expect(s.isOpenPoleEditorPanel).toBe(false);

        s.openPoleEditorPanel();
        expect(s.isOpenPoleEditorPanel).toBe(true);
        s.closePoleEditorPanel();
        expect(s.isOpenPoleEditorPanel).toBe(false);
    });

    it("остальные панели переключаются независимо", () => {
        const s = new UIPanelsStore();
        s.toggleTracksEditorPanel();
        s.toggleLinesEditorPanel();
        s.toggleJunctionsEditorPanel();

        expect(s.isOpenTracksEditorPanel).toBe(true);
        expect(s.isOpenLinesEditorPanel).toBe(true);
        expect(s.isOpenJunctionsEditorPanel).toBe(true);
        expect(s.isOpenPoleEditorPanel).toBe(false);
    });

    it("BulkPolesModal: toggle / open / close", () => {
        const s = new UIPanelsStore();
        s.toggleBulkPolesModal();
        expect(s.isBulkPolesModalOpen).toBe(true);
        s.closeBulkPolesModal();
        expect(s.isBulkPolesModalOpen).toBe(false);
        s.openBulkPolesModal();
        expect(s.isBulkPolesModalOpen).toBe(true);
    });
});
