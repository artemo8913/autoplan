import type { Pos } from "@/shared/types/catenaryTypes";

import type { ToolStateStore } from "../store/ToolStateStore";
import type { EntityService } from "./EntityService";
import type { SnapService } from "./SnapService";
import type { HitTestService } from "./HitTestService";

export class PlacementToolService {
    constructor(
        private readonly toolStateStore: ToolStateStore,
        private readonly entityService: EntityService,
        private readonly snapService: SnapService,
        private readonly hitTestService: HitTestService,
    ) {}

    createEntity(): void {
        const { toolState } = this.toolStateStore;

        if (toolState.tool !== "placement") {
            return;
        }

        const result = this.toolStateStore.commitPlacement();

        if (!result) {
            return;
        }

        if (result.config.kind === "disconnector") {
            const closest = this.hitTestService.findClosestCatenaryPole(result.pos);
            if (closest) {
                this.entityService.createDisconnector(
                    closest.id,
                    { controlType: result.config.controlType, phaseCount: result.config.phaseCount },
                    closest.yOffset,
                );
            }
            return;
        }

        this.entityService.createEntity(result.pos, result.config, result.snap);
    }

    updatePreview(svgPos: Pos): void {
        const { toolState } = this.toolStateStore;

        if (toolState.tool !== "placement") {
            return;
        }

        const snap = this.snapService.calcSnap(svgPos, toolState.entityConfig);
        this.toolStateStore.updatePlacementPreview(svgPos, snap);
    }

    reset(): void {
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
