import { describe, it, expect } from "vitest";

import { calcSvgPath } from "./svgPath";

describe("calcSvgPath", () => {
    it("пустой массив → пустая строка", () => {
        expect(calcSvgPath([])).toBe("");
    });

    it("одна точка → команда M", () => {
        expect(calcSvgPath([{ x: 1, y: 2 }])).toBe("M1,2 ");
    });

    it("несколько точек → M, затем L для остальных", () => {
        expect(
            calcSvgPath([
                { x: 0, y: 0 },
                { x: 10, y: 5 },
                { x: 20, y: -3 },
            ]),
        ).toBe("M0,0 L10,5 L20,-3 ");
    });
});
