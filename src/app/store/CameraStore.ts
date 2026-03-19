import { makeAutoObservable } from "mobx";

import type { ViewBox } from "@/shared/types/toolTypes";
import type { Pos } from "@/shared/types/catenaryTypes";

export class CameraStore {
    viewBox: ViewBox = { x: 0, y: 0, width: 2400, height: 500 };

    /** Снапшот viewBox на момент начала pan (null — pan не активен) */
    panStartViewBox: ViewBox | null = null;

    readonly minViewBoxWidth = 200;
    readonly maxViewBoxWidth = 20000;

    constructor() {
        makeAutoObservable(this, {
            minViewBoxWidth: false,
            maxViewBoxWidth: false,
        });
    }

    /** Сохранить текущий viewBox как начальную точку pan */
    startPan(): void {
        this.panStartViewBox = { ...this.viewBox };
    }

    /**
     * Обновить viewBox при pan.
     * deltaSvg — уже в SVG-единицах.
     */
    updatePan(deltaSvgX: number, deltaSvgY: number): void {
        if (!this.panStartViewBox) {
            return;
        }
        this.viewBox = {
            ...this.panStartViewBox,
            x: this.panStartViewBox.x - deltaSvgX,
            y: this.panStartViewBox.y - deltaSvgY,
        };
    }

    endPan(): void {
        this.panStartViewBox = null;
    }

    /**
     * Zoom к точке (svgPos — координаты под курсором).
     * factor > 1 — zoom out, factor < 1 — zoom in.
     */
    zoom(svgPos: Pos, factor: number): void {
        const newWidth = Math.max(this.minViewBoxWidth, Math.min(this.maxViewBoxWidth, this.viewBox.width * factor));
        const newHeight = (newWidth / this.viewBox.width) * this.viewBox.height;

        const ratioX = (svgPos.x - this.viewBox.x) / this.viewBox.width;
        const ratioY = (svgPos.y - this.viewBox.y) / this.viewBox.height;

        this.viewBox = {
            x: svgPos.x - ratioX * newWidth,
            y: svgPos.y - ratioY * newHeight,
            width: newWidth,
            height: newHeight,
        };
    }
}
