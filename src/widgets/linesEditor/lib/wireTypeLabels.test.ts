import { describe, it, expect } from "vitest";

import type { WireType } from "@/shared/types/catenaryTypes";

import { WIRE_TYPE_LABELS } from "./wireTypeLabels";

describe("WIRE_TYPE_LABELS", () => {
    it("покрывает все типы проводов", () => {
        const expected: WireType[] = [
            "feeding_25",
            "reinforcing",
            "screening",
            "return_air",
            "grounding",
            "radio_guide",
            "vl",
            "volp",
        ];
        expect(Object.keys(WIRE_TYPE_LABELS).sort()).toEqual([...expected].sort());
    });

    it("подписи непустые и содержат ожидаемые значения", () => {
        expect(WIRE_TYPE_LABELS.vl).toBe("ВЛ");
        expect(WIRE_TYPE_LABELS.feeding_25).toContain("2×25");
        expect(Object.values(WIRE_TYPE_LABELS).every((v) => v.length > 0)).toBe(true);
    });
});
