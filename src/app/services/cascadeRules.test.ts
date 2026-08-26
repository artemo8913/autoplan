import { describe, it, expect } from "vitest";

import {
    AnchorSection,
    CatenaryPole,
    CrossSpan,
    Disconnector,
    FixingPoint,
    Junction,
    Railway,
    Track,
    VlPole,
    WireLine,
} from "@/entities/catenaryPlanGraphic";

import { planDeletion } from "./cascadeRules";
import { makePlanEntityStores } from "./planStores.test-helper";

import { offsetFromGabarit } from "@/entities/catenaryPlanGraphic";
function apply(ops: Array<{ execute(): void; undo(): void }>): void {
    ops.forEach((op) => op.execute());
}

function revert(ops: Array<{ execute(): void; undo(): void }>): void {
    [...ops].reverse().forEach((op) => op.undo());
}

function setup() {
    const railway = new Railway({ name: "R", startX: 0, endX: 10000 });
    const stores = makePlanEntityStores(railway);

    const track = new Track({ railway, name: "1", startX: 0, endX: 10000, yOffsetMeters: 5 });
    stores.tracksStore.add(track);

    const makePole = (x: number, name: string, bindTrack = true) => {
        const pole = new CatenaryPole({
            x,
            name,
            trackBindings: bindTrack
                ? [{ track, offsetMeters: offsetFromGabarit(3.1, 1, track.directionMultiplier) }]
                : [],
        });
        stores.catenaryPoleStore.add(pole);
        return pole;
    };

    return { stores, railway, track, makePole };
}

describe("planDeletion — опора КС", () => {
    it("уносит ТФ на опоре, снимает её из списка АУ и с границ участка", () => {
        const { stores, makePole } = setup();
        const pole1 = makePole(100, "1");
        const pole2 = makePole(200, "2");
        const fp1 = new FixingPoint({ pole: pole1 });
        const fp2 = new FixingPoint({ pole: pole2 });
        stores.fixingPointsStore.add(fp1);
        stores.fixingPointsStore.add(fp2);
        const section = new AnchorSection({ fixingPoints: [fp1, fp2], startPole: pole1, endPole: pole2 });
        stores.anchorSectionsStore.add(section);

        const { ops, counts } = planDeletion([pole1.id], stores);
        apply(ops);

        expect(counts).toMatchObject({ poles: 1, fixingPoints: 1 });
        expect(stores.catenaryPoleStore.poles.has(pole1.id)).toBe(false);
        expect(stores.fixingPointsStore.fixingPoints.has(fp1.id)).toBe(false);
        expect(section.fixingPoints).toEqual([fp2]);
        expect(section.startPole).toBeUndefined();
        expect(section.endPole).toBe(pole2);
    });

    it("уносит поперечины на опоре и подвешенные к ним ТФ", () => {
        const { stores, makePole } = setup();
        const poleA = makePole(100, "1");
        const poleB = makePole(100, "2");
        const crossSpan = new CrossSpan({ spanType: "rigid", poleA, poleB });
        stores.crossSpansStore.add(crossSpan);
        const fp = new FixingPoint({ pole: poleA, supportType: "crossSpan", crossSpan });
        stores.fixingPointsStore.add(fp);
        const section = new AnchorSection({ fixingPoints: [fp] });
        stores.anchorSectionsStore.add(section);

        const { ops, counts } = planDeletion([poleB.id], stores);
        apply(ops);

        expect(counts).toMatchObject({ poles: 1, crossSpans: 1, fixingPoints: 1 });
        expect(stores.crossSpansStore.crossSpans.has(crossSpan.id)).toBe(false);
        expect(stores.fixingPointsStore.fixingPoints.has(fp.id)).toBe(false);
        expect(section.fixingPoints).toEqual([]);
    });

    it("уносит разъединители, установленные на опоре", () => {
        const { stores, makePole } = setup();
        const pole = makePole(100, "1");
        const disconnector = new Disconnector({
            name: "Р1",
            pole,
            controlType: "manual",
            state: "off",
            phaseCount: 1,
            yOffset: 10,
        });
        stores.disconnectorsStore.add(disconnector);

        const { ops, counts } = planDeletion([pole.id], stores);
        apply(ops);

        expect(counts.disconnectors).toBe(1);
        expect(stores.disconnectorsStore.disconnectors.has(disconnector.id)).toBe(false);
    });

    it("undo восстанавливает всю цепочку", () => {
        const { stores, makePole } = setup();
        const poleA = makePole(100, "1");
        const poleB = makePole(100, "2");
        const crossSpan = new CrossSpan({ spanType: "rigid", poleA, poleB });
        stores.crossSpansStore.add(crossSpan);
        const fp = new FixingPoint({ pole: poleA, supportType: "crossSpan", crossSpan });
        stores.fixingPointsStore.add(fp);
        const section = new AnchorSection({ fixingPoints: [fp], startPole: poleA, endPole: poleB });
        stores.anchorSectionsStore.add(section);

        const { ops } = planDeletion([poleA.id], stores);
        apply(ops);
        revert(ops);

        expect(stores.catenaryPoleStore.poles.get(poleA.id)).toBe(poleA);
        expect(stores.crossSpansStore.crossSpans.get(crossSpan.id)).toBe(crossSpan);
        expect(stores.fixingPointsStore.fixingPoints.get(fp.id)).toBe(fp);
        expect(section.fixingPoints).toEqual([fp]);
        expect(section.startPole).toBe(poleA);
        expect(section.endPole).toBe(poleB);
    });
});

describe("planDeletion — АУ и линии ВЛ", () => {
    it("АУ уносит свои ТФ и сопряжения, ссылающиеся на неё", () => {
        const { stores, makePole } = setup();
        const pole = makePole(100, "1");
        const fp = new FixingPoint({ pole });
        stores.fixingPointsStore.add(fp);
        const section1 = new AnchorSection({ fixingPoints: [fp], startPole: pole });
        const section2 = new AnchorSection({ startPole: pole });
        stores.anchorSectionsStore.add(section1);
        stores.anchorSectionsStore.add(section2);
        const junction = new Junction({ section1, section2, type: "non-insulating" });
        stores.junctionsStore.add(junction);

        const { ops, counts } = planDeletion([section1.id], stores);
        apply(ops);

        expect(counts).toMatchObject({ anchorSections: 1, fixingPoints: 1, junctions: 1 });
        expect(stores.anchorSectionsStore.anchorSections.has(section1.id)).toBe(false);
        expect(stores.junctionsStore.junctions.has(junction.id)).toBe(false);
        expect(stores.fixingPointsStore.fixingPoints.has(fp.id)).toBe(false);
        expect(stores.anchorSectionsStore.anchorSections.has(section2.id)).toBe(true);
    });

    it("линия ВЛ уносит свои ТФ, а удалённая опора ВЛ — снимается из списка линии", () => {
        const { stores } = setup();
        const vlPole = new VlPole({ x: 50, y: 0, name: "В1", vlType: "intermediate" });
        stores.vlPolesStore.add(vlPole);
        const fp = new FixingPoint({ pole: vlPole, yOffset: 10 });
        stores.fixingPointsStore.add(fp);
        const wire = new WireLine({ wireType: "vl", fixingPoints: [fp] });
        stores.wireLinesStore.add(wire);

        const { ops, counts } = planDeletion([vlPole.id], stores);
        apply(ops);

        expect(counts).toMatchObject({ vlPoles: 1, fixingPoints: 1 });
        expect(stores.fixingPointsStore.fixingPoints.has(fp.id)).toBe(false);
        expect(wire.fixingPoints).toEqual([]);
        expect(stores.wireLinesStore.wireLines.has(wire.id)).toBe(true);
    });
});

describe("planDeletion — путь", () => {
    it("снимает привязки опор, путь у ТФ и primaryTrack у АУ", () => {
        const { stores, track, makePole } = setup();
        const pole = makePole(100, "1");
        const fp = new FixingPoint({ pole, track });
        stores.fixingPointsStore.add(fp);
        const section = new AnchorSection({ fixingPoints: [fp], primaryTrack: track });
        stores.anchorSectionsStore.add(section);

        const { ops, counts } = planDeletion([track.id], stores);
        apply(ops);

        expect(counts).toMatchObject({ tracks: 1, poles: 0, fixingPoints: 0 });
        expect(stores.tracksStore.tracks.has(track.id)).toBe(false);
        expect(pole.hasTrack(track.id)).toBe(false);
        expect(fp.track).toBeUndefined();
        expect(section.primaryTrack).toBeUndefined();
        expect(stores.fixingPointsStore.fixingPoints.has(fp.id)).toBe(true);

        revert(ops);

        expect(stores.tracksStore.tracks.get(track.id)).toBe(track);
        expect(pole.hasTrack(track.id)).toBe(true);
        expect(fp.track).toBe(track);
        expect(section.primaryTrack).toBe(track);
    });
});

describe("planDeletion — прочее", () => {
    it("неизвестные id игнорируются", () => {
        const { stores } = setup();
        const { ops, counts } = planDeletion(["нет-такого"], stores);

        expect(ops).toEqual([]);
        expect(counts).toMatchObject({ poles: 0, fixingPoints: 0 });
    });

    it("одна ТФ снимается с родителя, но сам родитель остаётся", () => {
        const { stores, makePole } = setup();
        const pole = makePole(100, "1");
        const fp = new FixingPoint({ pole });
        stores.fixingPointsStore.add(fp);
        const section = new AnchorSection({ fixingPoints: [fp] });
        stores.anchorSectionsStore.add(section);

        const { ops } = planDeletion([fp.id], stores);
        apply(ops);

        expect(stores.fixingPointsStore.fixingPoints.has(fp.id)).toBe(false);
        expect(section.fixingPoints).toEqual([]);
        expect(stores.anchorSectionsStore.anchorSections.has(section.id)).toBe(true);
        expect(stores.catenaryPoleStore.poles.has(pole.id)).toBe(true);
    });
});
