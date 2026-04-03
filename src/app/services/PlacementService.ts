import type { Pos } from "@/shared/types/catenaryTypes";

import type { ToolStateStore } from "../store/ToolStateStore";
import type { EntityService } from "./EntityService";
import type { SnapService } from "./SnapService";

export class PlacementService {
    constructor(
        private readonly toolStateStore: ToolStateStore,
        private readonly entityService: EntityService,
        private readonly snapService: SnapService,
    ) {}

    onMouseDown(): void {
        const result = this.toolStateStore.commitPlacement();
        if (result) {
            this.entityService.createEntity(result.pos, result.config, result.snap);
        }
    }

    onMouseMove(svgPos: Pos): void {
        const { toolState } = this.toolStateStore;
        if (toolState.tool !== "placement") {
            return;
        }
        const snap = this.snapService.calcSnap(svgPos, toolState.entityConfig);
        this.toolStateStore.updatePlacementPreview(svgPos, snap);
    }

    onMouseLeave(): void {
        const { toolState } = this.toolStateStore;
        if (toolState.tool !== "placement") {
            return;
        }
        toolState.previewPos = null;
    }

    setRepeating(active: boolean): void {
        this.toolStateStore.setPlacementRepeating(active);
    }
}
