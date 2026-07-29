import { describe, it, expect } from "vitest";

import { AnchorSection, CatenaryPole, Junction } from "@/entities/catenaryPlanGraphic";

import { JunctionsStore } from "./JunctionsStore";

const pole = (name: string) => new CatenaryPole({ x: 0, name, tracks: {} });

/** Сопряжение, у которого anchorPoleIds = [endPoleA, startPoleB]. */
function makeJunction(type: "insulating" | "non-insulating", endPoleA: CatenaryPole, startPoleB: CatenaryPole) {
    const s1 = new AnchorSection({ endPole: endPoleA });
    const s2 = new AnchorSection({ startPole: startPoleB });
    return new Junction({ section1: s1, section2: s2, type });
}

describe("JunctionsStore — CRUD", () => {
    it("add / remove / clear / loadFrom / list", () => {
        const store = new JunctionsStore([]);
        const j = makeJunction("non-insulating", pole("1"), pole("2"));

        store.add(j);
        expect(store.list).toEqual([j]);

        store.remove(j.id);
        expect(store.list).toHaveLength(0);

        store.loadFrom([j]);
        expect(store.list).toEqual([j]);

        store.clear();
        expect(store.list).toHaveLength(0);
    });
});

describe("JunctionsStore.insulatingJunctionAnchorPoleIds", () => {
    it("собирает anchorPoleIds только изолирующих сопряжений", () => {
        const b = pole("B");
        const c = pole("C");
        const d = pole("D");
        const e = pole("E");

        const insulating = makeJunction("insulating", b, c);
        const nonInsulating = makeJunction("non-insulating", d, e);

        const store = new JunctionsStore([insulating, nonInsulating]);
        const ids = store.insulatingJunctionAnchorPoleIds;

        expect(ids).toEqual(new Set([b.id, c.id]));
        expect(ids.has(d.id)).toBe(false);
    });

    it("пустой набор без изолирующих сопряжений", () => {
        const store = new JunctionsStore([makeJunction("non-insulating", pole("1"), pole("2"))]);
        expect(store.insulatingJunctionAnchorPoleIds.size).toBe(0);
    });
});
