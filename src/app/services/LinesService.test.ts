import { describe, it, expect } from "vitest";

import { CatenaryType, RelativeSidePosition } from "@/shared/types/catenaryTypes";
import { CatenaryPole, CrossSpan, FixingPoint, Junction, Railway, Track } from "@/entities/catenaryPlanGraphic";

import { LinesService } from "./LinesService";
import { UndoStackStore } from "../store/UndoStackStore";
import { makePlanEntityStores } from "./planStores.test-helper";

function setup() {
    const railway = new Railway({ name: "R", startX: 0, endX: 10000 });
    const stores = makePlanEntityStores(railway);
    const undoStackStore = new UndoStackStore();
    const service = new LinesService(stores, undoStackStore);

    const track = new Track({ railway, name: "1", startX: 0, endX: 10000, yOffsetMeters: 5 });
    stores.tracksStore.add(track);

    const makePole = (x: number, name: string) => {
        const pole = new CatenaryPole({
            x,
            name,
            trackBindings: [{ track, gabarit: 3.1, relativePositionToTrack: RelativeSidePosition.LEFT }],
        });
        stores.catenaryPoleStore.add(pole);
        return pole;
    };

    return { service, stores, undoStackStore, track, makePole };
}

describe("LinesService — анкерные участки", () => {
    it("createAnchorSection кладёт АУ в стор и откатывается", () => {
        const { service, stores, undoStackStore } = setup();

        const section = service.createAnchorSection();
        expect(stores.anchorSectionsStore.anchorSections.get(section.id)).toBe(section);

        undoStackStore.undo();
        expect(stores.anchorSectionsStore.anchorSections.has(section.id)).toBe(false);

        undoStackStore.redo();
        expect(stores.anchorSectionsStore.anchorSections.get(section.id)).toBe(section);
    });

    it("deleteAnchorSection уносит ТФ и сопряжения, undo возвращает всё", () => {
        const { service, stores, undoStackStore, makePole } = setup();
        const pole = makePole(100, "1");
        const section = service.createAnchorSection();
        const other = service.createAnchorSection();
        const fp = service.addFixingPoint(section, { pole });
        const junction = new Junction({ section1: section, section2: other, type: "non-insulating" });
        stores.junctionsStore.add(junction);

        service.deleteAnchorSection(section);

        expect(stores.anchorSectionsStore.anchorSections.has(section.id)).toBe(false);
        expect(stores.fixingPointsStore.fixingPoints.has(fp.id)).toBe(false);
        expect(stores.junctionsStore.junctions.has(junction.id)).toBe(false);

        undoStackStore.undo();

        expect(stores.anchorSectionsStore.anchorSections.get(section.id)).toBe(section);
        expect(stores.fixingPointsStore.fixingPoints.get(fp.id)).toBe(fp);
        expect(stores.junctionsStore.junctions.get(junction.id)).toBe(junction);
        expect(section.fixingPoints).toEqual([fp]);
    });

    it("границы АУ ставятся вместе с автоматической оттяжкой; undo снимает и её", () => {
        const { service, undoStackStore, makePole } = setup();
        const pole = makePole(100, "1");
        const section = service.createAnchorSection();

        service.setAnchorSectionStartPole(section, pole);

        expect(section.startPole).toBe(pole);
        expect(pole.anchorGuy).toEqual({ type: "single", direction: RelativeSidePosition.LEFT });

        undoStackStore.undo();

        expect(section.startPole).toBeUndefined();
        expect(pole.anchorGuy).toBeUndefined();
    });

    it("уже заданная оттяжка граничной опоры не перезаписывается", () => {
        const { service, makePole } = setup();
        const pole = makePole(100, "1");
        pole.setAnchorGuy({ type: "double", direction: RelativeSidePosition.RIGHT });
        const section = service.createAnchorSection();

        service.setAnchorSectionEndPole(section, pole);

        expect(pole.anchorGuy).toEqual({ type: "double", direction: RelativeSidePosition.RIGHT });
    });

    it("правки свойств АУ обратимы", () => {
        const { service, undoStackStore, track } = setup();
        const section = service.createAnchorSection();

        service.setAnchorSectionType(section, CatenaryType.CS120);
        service.setAnchorSectionPrimaryTrack(section, track);

        expect(section.type).toBe(CatenaryType.CS120);
        expect(section.primaryTrack).toBe(track);

        undoStackStore.undo();
        expect(section.primaryTrack).toBeUndefined();
        undoStackStore.undo();
        expect(section.type).toBe(CatenaryType.CS140);
    });

    it("серия правок имени склеивается в одну запись undo-стека", () => {
        const { service, undoStackStore } = setup();
        const section = service.createAnchorSection();
        const depthBefore = undoStackStore.undoStack.length;

        service.setAnchorSectionName(section, "А");
        service.setAnchorSectionName(section, "АУ");
        service.setAnchorSectionName(section, "АУ-1");

        expect(section.name).toBe("АУ-1");
        expect(undoStackStore.undoStack.length).toBe(depthBefore + 1);

        undoStackStore.undo();
        expect(section.name).toBe("");
    });
});

describe("LinesService — точки фиксации", () => {
    it("addFixingPoint добавляет в конец, с afterFpId — сразу после указанной", () => {
        const { service, stores, makePole } = setup();
        const section = service.createAnchorSection();
        const p1 = makePole(100, "1");
        const p2 = makePole(200, "2");
        const p3 = makePole(150, "3");

        const fp1 = service.addFixingPoint(section, { pole: p1 });
        const fp2 = service.addFixingPoint(section, { pole: p2 });
        const fp3 = service.addFixingPoint(section, { pole: p3, afterFpId: fp1.id });

        expect(section.fixingPoints).toEqual([fp1, fp3, fp2]);
        expect(stores.fixingPointsStore.list).toHaveLength(3);
    });

    it("ТФ на поперечине получает supportType crossSpan", () => {
        const { service, stores, makePole } = setup();
        const poleA = makePole(100, "1");
        const poleB = makePole(100, "2");
        const crossSpan = new CrossSpan({ spanType: "rigid", poleA, poleB });
        stores.crossSpansStore.add(crossSpan);
        const section = service.createAnchorSection();

        const fp = service.addFixingPoint(section, { pole: poleA, crossSpan });

        expect(fp.supportType).toBe("crossSpan");
        expect(fp.crossSpan).toBe(crossSpan);
    });

    it("bulkAddFixingPoints — одна команда undo на весь набор, путь берётся у АУ", () => {
        const { service, stores, undoStackStore, track, makePole } = setup();
        const section = service.createAnchorSection();
        service.setAnchorSectionPrimaryTrack(section, track);
        const depthBefore = undoStackStore.undoStack.length;

        service.bulkAddFixingPoints(section, [{ pole: makePole(100, "1") }, { pole: makePole(200, "2") }]);

        expect(section.fixingPoints).toHaveLength(2);
        expect(section.fixingPoints[0].track).toBe(track);
        expect(undoStackStore.undoStack.length).toBe(depthBefore + 1);

        undoStackStore.undo();

        expect(section.fixingPoints).toEqual([]);
        expect(stores.fixingPointsStore.list).toEqual([]);
    });

    it("deleteFixingPoint снимает ТФ с родителя и из стора, undo возвращает на место", () => {
        const { service, stores, undoStackStore, makePole } = setup();
        const section = service.createAnchorSection();
        const fp1 = service.addFixingPoint(section, { pole: makePole(100, "1") });
        const fp2 = service.addFixingPoint(section, { pole: makePole(200, "2") });

        service.deleteFixingPoint(fp1, section);

        expect(section.fixingPoints).toEqual([fp2]);
        expect(stores.fixingPointsStore.fixingPoints.has(fp1.id)).toBe(false);

        undoStackStore.undo();

        expect(section.fixingPoints).toEqual([fp1, fp2]);
        expect(stores.fixingPointsStore.fixingPoints.get(fp1.id)).toBe(fp1);
    });

    it("moveFixingPoint меняет порядок и откатывается", () => {
        const { service, undoStackStore, makePole } = setup();
        const section = service.createAnchorSection();
        const fp1 = service.addFixingPoint(section, { pole: makePole(100, "1") });
        const fp2 = service.addFixingPoint(section, { pole: makePole(200, "2") });

        service.moveFixingPoint(section, fp2.id, "up");
        expect(section.fixingPoints).toEqual([fp2, fp1]);

        undoStackStore.undo();
        expect(section.fixingPoints).toEqual([fp1, fp2]);
    });

    it("setFixingPointTrack и зигзаг обратимы", () => {
        const { service, undoStackStore, track, makePole } = setup();
        const section = service.createAnchorSection();
        const fp = service.addFixingPoint(section, { pole: makePole(100, "1") });

        service.setFixingPointTrack(fp, track);
        service.setFixingPointZigzag(fp, 300);

        expect(fp.track).toBe(track);
        expect(fp.zigzagValue).toBe(300);

        undoStackStore.undo();
        expect(fp.zigzagValue).toBeUndefined();
        undoStackStore.undo();
        expect(fp.track).toBeUndefined();
    });
});

describe("LinesService — линии ВЛ", () => {
    it("createWireLine / deleteWireLine с каскадом по ТФ", () => {
        const { service, stores, undoStackStore, makePole } = setup();
        const wire = service.createWireLine();
        const fp = service.addFixingPoint(wire, { pole: makePole(100, "1"), yOffset: 20 });

        expect(stores.wireLinesStore.wireLines.get(wire.id)).toBe(wire);
        expect(wire.fixingPoints).toEqual([fp]);

        service.deleteWireLine(wire);

        expect(stores.wireLinesStore.wireLines.has(wire.id)).toBe(false);
        expect(stores.fixingPointsStore.fixingPoints.has(fp.id)).toBe(false);

        undoStackStore.undo();

        expect(stores.wireLinesStore.wireLines.get(wire.id)).toBe(wire);
        expect(stores.fixingPointsStore.fixingPoints.get(fp.id)).toBe(fp);
    });

    it("тип и метка линии обратимы", () => {
        const { service, undoStackStore } = setup();
        const wire = service.createWireLine();

        service.setWireLineType(wire, "reinforcing");
        service.setWireLineLabel(wire, "ВЛ-1");

        expect(wire.wireType).toBe("reinforcing");
        expect(wire.label).toBe("ВЛ-1");

        undoStackStore.undo();
        expect(wire.label).toBeUndefined();
        undoStackStore.undo();
        expect(wire.wireType).toBe("vl");
    });

    it("смещение ТФ линии правится через сервис", () => {
        const { service, undoStackStore, makePole } = setup();
        const wire = service.createWireLine();
        const fp = service.addFixingPoint(wire, { pole: makePole(100, "1"), yOffset: 0 });

        service.setFixingPointYOffset(fp, 25);
        expect(fp.yOffset).toBe(25);

        undoStackStore.undo();
        expect(fp.yOffset).toBe(0);
    });
});

describe("LinesService — ТФ, созданные напрямую, тоже участвуют в каскаде", () => {
    it("удаление АУ уносит вручную добавленную ТФ", () => {
        const { service, stores, makePole } = setup();
        const section = service.createAnchorSection();
        const fp = new FixingPoint({ pole: makePole(100, "1") });
        section.addFixingPoint(fp);
        stores.fixingPointsStore.add(fp);

        service.deleteAnchorSection(section);

        expect(stores.fixingPointsStore.fixingPoints.has(fp.id)).toBe(false);
    });
});
