import { describe, it, expect } from "vitest";

import { CatenaryPole } from "@/entities/catenaryPlanGraphic";
import { RelativeSidePosition } from "@/shared/types/catenaryTypes";

import { autoSetAnchorGuy } from "./anchorSectionUtils";

const pole = () => new CatenaryPole({ x: 0, name: "1", tracks: {} });

describe("autoSetAnchorGuy", () => {
    it("устанавливает одиночную оттяжку, если ещё не задана", () => {
        const p = pole();
        autoSetAnchorGuy(p, RelativeSidePosition.RIGHT);
        expect(p.anchorGuy).toEqual({ type: "single", direction: RelativeSidePosition.RIGHT });
    });

    it("не перезаписывает уже заданную оттяжку", () => {
        const p = pole();
        p.setAnchorGuy({ type: "double", direction: RelativeSidePosition.LEFT });
        autoSetAnchorGuy(p, RelativeSidePosition.RIGHT);
        expect(p.anchorGuy).toEqual({ type: "double", direction: RelativeSidePosition.LEFT });
    });

    it("безопасно при отсутствии опоры", () => {
        expect(() => autoSetAnchorGuy(undefined, RelativeSidePosition.RIGHT)).not.toThrow();
    });
});
