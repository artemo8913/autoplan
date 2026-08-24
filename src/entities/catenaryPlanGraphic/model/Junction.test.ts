import { describe, it, expect } from "vitest";

import { AnchorSection } from "./AnchorSection";
import { CatenaryPole } from "./CatenaryPole";
import { Junction } from "./Junction";

const pole = (x: number) => new CatenaryPole({ x, name: String(x), trackBindings: [] });

function junctionOf(s1Range: [number, number], s2Range: [number, number]) {
    const section1 = new AnchorSection({ startPole: pole(s1Range[0]), endPole: pole(s1Range[1]) });
    const section2 = new AnchorSection({ startPole: pole(s2Range[0]), endPole: pole(s2Range[1]) });
    return new Junction({ section1, section2, type: "non-insulating" });
}

describe("Junction.overlapXRange", () => {
    it("пересечение диапазонов двух АУ", () => {
        // s1 [0,150], s2 [100,200] → [max(0,100), min(150,200)] = [100,150]
        expect(junctionOf([0, 150], [100, 200]).overlapXRange).toEqual({ start: 100, end: 150 });
    });

    it("undefined, если у секции нет start/endPole", () => {
        const section1 = new AnchorSection({ startPole: pole(0) }); // нет endPole
        const section2 = new AnchorSection({ startPole: pole(100), endPole: pole(200) });
        const junction = new Junction({ section1, section2, type: "non-insulating" });

        expect(junction.overlapXRange).toBeUndefined();
    });
});

describe("Junction.anchorPoleIds", () => {
    it("содержит endPole первой и startPole второй секции", () => {
        const s1End = pole(150);
        const s2Start = pole(100);
        const section1 = new AnchorSection({ startPole: pole(0), endPole: s1End });
        const section2 = new AnchorSection({ startPole: s2Start, endPole: pole(200) });
        const junction = new Junction({ section1, section2, type: "non-insulating" });

        expect(junction.anchorPoleIds).toEqual([s1End.id, s2Start.id]);
    });
});
