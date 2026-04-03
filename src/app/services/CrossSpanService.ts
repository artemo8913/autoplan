import type { Pos } from "@/shared/types/catenaryTypes";

import type { ToolStateStore } from "../store/ToolStateStore";
import type { EntityService } from "./EntityService";
import type { HitTestService } from "./HitTestService";

export class CrossSpanService {
    constructor(
        private readonly toolStateStore: ToolStateStore,
        private readonly entityService: EntityService,
        private readonly hitTestService: HitTestService,
    ) {}

    onMouseDown(svgPos: Pos, svgPerPx: number): void {
        const hit = this.hitTestService.hitTestPoleOnly(svgPos, svgPerPx);
        if (!hit) {
            return;
        }
        const ts = this.toolStateStore.toolState;
        if (ts.tool !== "crossSpan") {
            return;
        }
        if (!ts.poleAId) {
            this.toolStateStore.setCrossSpanPoleA(hit.id);
        } else {
            this.toolStateStore.setCrossSpanPreviewPoleB(hit.id);
            const result = this.toolStateStore.commitCrossSpan();
            if (result) {
                this.entityService.createCrossSpan(result.spanType, result.poleAId, result.poleBId);
            }
        }
    }

    onMouseMove(svgPos: Pos, svgPerPx: number): void {
        const ts = this.toolStateStore.toolState;
        if (ts.tool !== "crossSpan" || !ts.poleAId) {
            return;
        }
        const hit = this.hitTestService.hitTestPoleOnly(svgPos, svgPerPx);
        this.toolStateStore.setCrossSpanPreviewPoleB(hit?.id ?? null);
    }

    onEscape(): void {
        this.toolStateStore.resetToIdle();
    }
}
