import type { RelativeSidePosition } from "@/shared/types/catenaryTypes";
import type { CatenaryPole } from "@/entities/catenaryPlanGraphic";

/** Авто-установка оттяжки на граничной опоре АУ (если ещё не задана) */
export function autoSetAnchorGuy(pole: CatenaryPole | undefined, direction: RelativeSidePosition): void {
    if (!pole || pole.anchorGuy) return;
    pole.setAnchorGuy({ type: "single", direction });
}
