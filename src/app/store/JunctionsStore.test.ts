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

describe("JunctionsStore — каскад по АУ", () => {
    /** АУ A—B и B—C: у B два сопряжения, у A и C — по одному. */
    function makeChain() {
        const a = new AnchorSection({ endPole: pole("1") });
        const b = new AnchorSection({ startPole: pole("2"), endPole: pole("3") });
        const c = new AnchorSection({ startPole: pole("4") });

        const ab = new Junction({ section1: a, section2: b, type: "non-insulating" });
        const bc = new Junction({ section1: b, section2: c, type: "insulating" });

        return { a, b, c, ab, bc, store: new JunctionsStore([ab, bc]) };
    }

    it("listBySection находит сопряжения по обеим сторонам", () => {
        const { a, b, c, ab, bc, store } = makeChain();

        expect(store.listBySection(a.id)).toEqual([ab]);
        expect(store.listBySection(c.id)).toEqual([bc]);
        expect(store.listBySection(b.id)).toEqual([ab, bc]);
    });

    it("listBySection пуст для АУ без сопряжений", () => {
        const { store } = makeChain();
        expect(store.listBySection(new AnchorSection({}).id)).toEqual([]);
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
