import { describe, it, expect } from "vitest";

import { CatenaryPole, CrossSpan } from "@/entities/catenaryPlanGraphic";

import { computeBulkCrossSpanValues } from "./computeBulkCrossSpanValues";

const poleA = new CatenaryPole({ x: 0, name: "1", trackBindings: [] });
const poleB = new CatenaryPole({ x: 60, name: "2", trackBindings: [] });

const make = (params: Partial<ConstructorParameters<typeof CrossSpan>[0]> = {}) =>
    new CrossSpan({ spanType: "rigid", poleA, poleB, ...params });

describe("computeBulkCrossSpanValues", () => {
    it("одинаковые значения отдаются как есть", () => {
        const values = computeBulkCrossSpanValues([
            make({ beamMark: "Р-3", loadKn: 10 }),
            make({ beamMark: "Р-3", loadKn: 10 }),
        ]);

        expect(values).toEqual({ spanType: "rigid", mark: "Р-3", loadKn: 10 });
    });

    it("расхождение по любому полю — mixed", () => {
        const values = computeBulkCrossSpanValues([
            make({ beamMark: "Р-3", loadKn: 10 }),
            make({ spanType: "flexible", wireMark: "ПБСМ-70" }),
        ]);

        expect(values).toEqual({ spanType: "mixed", mark: "mixed", loadKn: "mixed" });
    });

    it("незаполненные характеристики — общее undefined, а не «разные»", () => {
        expect(computeBulkCrossSpanValues([make(), make()])).toEqual({
            spanType: "rigid",
            mark: undefined,
            loadKn: undefined,
        });
    });

    it("пустое выделение не падает", () => {
        expect(computeBulkCrossSpanValues([])).toEqual({ spanType: "flexible", mark: undefined, loadKn: undefined });
    });
});
