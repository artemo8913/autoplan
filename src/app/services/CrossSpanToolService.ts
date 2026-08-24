import type { Pos } from "@/shared/types/catenaryTypes";

import type { ToolStateStore } from "../store/ToolStateStore";
import type { EntityService } from "./EntityService";
import type { HitTestService } from "./HitTestService";
import type { NotificationService } from "./NotificationService";

export class CrossSpanToolService {
    constructor(
        private readonly toolStateStore: ToolStateStore,
        private readonly entityService: EntityService,
        private readonly hitTestService: HitTestService,
        private readonly notificationService: NotificationService,
    ) {}

    pickPole(svgPos: Pos, svgPerPx: number): void {
        const hit = this.hitTestService.hitTestPoleOnly(svgPos, svgPerPx);
        if (!hit) {
            this.notificationService.warning("Поперечина строится по опорам — кликните по опоре", {
                key: "crossspan-pick",
            });
            return;
        }
        const ts = this.toolStateStore.toolState;
        if (ts.tool !== "crossSpan") {
            return;
        }
        if (!ts.poleAId) {
            this.toolStateStore.setCrossSpanPoleA(hit.id);
            return;
        }
        if (ts.poleAId === hit.id) {
            this.notificationService.warning("Нужны две разные опоры: выберите вторую", { key: "crossspan-pick" });
            return;
        }

        this.toolStateStore.setCrossSpanPreviewPoleB(hit.id);
        const result = this.toolStateStore.commitCrossSpan();
        if (result) {
            this.entityService.createCrossSpan(result.spanType, result.poleAId, result.poleBId);
        }
    }

    updatePreview(svgPos: Pos, svgPerPx: number): void {
        const ts = this.toolStateStore.toolState;
        if (ts.tool !== "crossSpan" || !ts.poleAId) {
            return;
        }
        const hit = this.hitTestService.hitTestPoleOnly(svgPos, svgPerPx);
        this.toolStateStore.setCrossSpanPreviewPoleB(hit?.id ?? null);
    }
}
