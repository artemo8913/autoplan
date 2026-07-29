import type { ViewBox } from "@/shared/types/toolTypes";
import type { Pos } from "@/shared/types/catenaryTypes";

import type { CameraStore } from "../store/CameraStore";
import type { ToolStateStore } from "../store/ToolStateStore";

export class CameraService {
    constructor(
        private readonly cameraStore: CameraStore,
        private readonly toolStateStore: ToolStateStore,
    ) {}

    get viewBox(): ViewBox {
        return this.cameraStore.viewBox;
    }

    startPan(screenPos: Pos): void {
        this.cameraStore.startPan();
        this.toolStateStore.startPan(screenPos);
    }

    updatePan(deltaSvgX: number, deltaSvgY: number): void {
        this.cameraStore.updatePan(deltaSvgX, deltaSvgY);
    }

    endPan(): void {
        this.cameraStore.endPan();
        this.toolStateStore.endPan();
    }

    zoom(svgPos: Pos, factor: number): void {
        this.cameraStore.zoom(svgPos, factor);
    }
}
