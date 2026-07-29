import { describe, it, expect } from "vitest";

import { CameraStore } from "./CameraStore";

describe("CameraStore.fitToRailway", () => {
    it("вписывает диапазон с отступом 5%", () => {
        const cam = new CameraStore(); // default w2400 h500
        cam.fitToRailway(0, 10000);
        expect(cam.viewBox).toEqual({ x: -500, y: -250, width: 11000, height: 500 });
    });

    it("ширина зажимается max лимитом", () => {
        const cam = new CameraStore();
        cam.fitToRailway(0, 100000);
        expect(cam.viewBox.width).toBe(20000); // maxViewBoxWidth
    });
});

describe("CameraStore.zoom", () => {
    it("zoom in (factor<1) уменьшает viewBox, сохраняя точку под курсором", () => {
        const cam = new CameraStore(); // x0 y0 w2400 h500 → центр (1200, 250)
        cam.zoom({ x: 1200, y: 250 }, 0.5);
        expect(cam.viewBox).toEqual({ x: 600, y: 125, width: 1200, height: 250 });
    });

    it("ширина зажимается min и max лимитами", () => {
        const cam = new CameraStore();
        cam.zoom({ x: 0, y: 0 }, 0.00001);
        expect(cam.viewBox.width).toBe(200); // minViewBoxWidth
        cam.zoom({ x: 0, y: 0 }, 1000);
        expect(cam.viewBox.width).toBe(20000); // maxViewBoxWidth
    });
});

describe("CameraStore pan", () => {
    it("updatePan смещает viewBox от снапшота startPan", () => {
        const cam = new CameraStore();
        cam.startPan();
        cam.updatePan(100, 50);
        expect(cam.viewBox.x).toBe(-100);
        expect(cam.viewBox.y).toBe(-50);
    });

    it("updatePan без startPan — no-op", () => {
        const cam = new CameraStore();
        cam.updatePan(100, 50);
        expect(cam.viewBox.x).toBe(0);
    });

    it("endPan сбрасывает снапшот", () => {
        const cam = new CameraStore();
        cam.startPan();
        cam.endPan();
        cam.updatePan(100, 50); // снапшота нет → no-op
        expect(cam.viewBox.x).toBe(0);
    });
});
