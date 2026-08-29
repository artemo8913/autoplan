import { describe, it, expect, beforeEach } from "vitest";

import { CatenaryPole, CrossSpan } from "@/entities/catenaryPlanGraphic";

import { UndoStackStore } from "../store/UndoStackStore";
import { CrossSpanService } from "./CrossSpanService";

function setup() {
    const poleA = new CatenaryPole({ x: 0, name: "5", trackBindings: [] });
    const poleB = new CatenaryPole({ x: 60, name: "7", trackBindings: [] });
    const undoStackStore = new UndoStackStore();
    const service = new CrossSpanService(undoStackStore);
    const rigid = new CrossSpan({ spanType: "rigid", poleA, poleB });
    const flexible = new CrossSpan({ spanType: "flexible", poleA, poleB });

    return { undoStackStore, service, rigid, flexible };
}

describe("CrossSpanService: одна поперечина", () => {
    let s: ReturnType<typeof setup>;

    beforeEach(() => {
        s = setup();
    });

    it("марка жёсткой пишется в марку ригеля, гибкой — в марку троса", () => {
        s.service.setMark(s.rigid, "Р-3");
        s.service.setMark(s.flexible, "ПБСМ-70");

        expect(s.rigid).toMatchObject({ beamMark: "Р-3", wireMark: undefined });
        expect(s.flexible).toMatchObject({ beamMark: undefined, wireMark: "ПБСМ-70" });
    });

    it("пустая марка очищает поле, а не пишет пустую строку", () => {
        s.service.setMark(s.rigid, "Р-3");
        s.service.setMark(s.rigid, "   ");

        expect(s.rigid.beamMark).toBeUndefined();
    });

    it("undo возвращает прежние значения марки, типа и нагрузки", () => {
        s.service.setSpanType(s.rigid, "flexible");
        s.service.setLoadKn(s.rigid, 12.5);
        s.service.setMark(s.rigid, "ПБСМ-70");

        s.undoStackStore.undo();
        s.undoStackStore.undo();
        s.undoStackStore.undo();

        expect(s.rigid).toMatchObject({ spanType: "rigid", loadKn: undefined, wireMark: undefined });
    });

    it("подряд идущие правки одного поля схлопываются в одну запись undo", () => {
        s.service.setMark(s.rigid, "Р");
        s.service.setMark(s.rigid, "Р-");
        s.service.setMark(s.rigid, "Р-3");

        expect(s.undoStackStore.undoStack).toHaveLength(1);

        s.undoStackStore.undo();

        expect(s.rigid.beamMark).toBeUndefined();
    });

    it("правки марки и нагрузки не склеиваются между собой", () => {
        s.service.setMark(s.rigid, "Р-3");
        s.service.setLoadKn(s.rigid, 12.5);

        expect(s.undoStackStore.undoStack).toHaveLength(2);
    });
});

describe("CrossSpanService: мультивыделение", () => {
    it("тип применяется ко всем одной командой", () => {
        const { service, undoStackStore, rigid, flexible } = setup();

        service.setBulkSpanType([rigid, flexible], "flexible");

        expect([rigid.spanType, flexible.spanType]).toEqual(["flexible", "flexible"]);
        expect(undoStackStore.undoStack).toHaveLength(1);

        undoStackStore.undo();

        expect([rigid.spanType, flexible.spanType]).toEqual(["rigid", "flexible"]);
    });

    it("команда не создаётся, если менять нечего", () => {
        const { service, undoStackStore, rigid } = setup();

        service.setBulkSpanType([rigid], "rigid");
        service.setBulkMark([rigid], "");
        service.setBulkLoadKn([rigid], undefined);

        expect(undoStackStore.undoStack).toHaveLength(0);
    });

    it("массовая марка ложится в поле по типу каждой поперечины", () => {
        const { service, rigid, flexible } = setup();

        service.setBulkMark([rigid, flexible], "X-1");

        expect(rigid.beamMark).toBe("X-1");
        expect(flexible.wireMark).toBe("X-1");
    });
});
