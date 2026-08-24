import { describe, it, expect } from "vitest";

import { AnchorSection, CatenaryPole, FixingPoint, Junction } from "@/entities/catenaryPlanGraphic";

import { JunctionService } from "./JunctionService";
import { UndoStackStore } from "../store/UndoStackStore";
import { makePlanEntityStores } from "./planStores.test-helper";
import { MemoryNotificationService } from "./NotificationService";

function setup() {
    const stores = makePlanEntityStores();
    const undoStackStore = new UndoStackStore();
    const notificationService = new MemoryNotificationService();
    const service = new JunctionService(stores, undoStackStore, notificationService);
    return { service, stores, undoStackStore, notificationService };
}

const pole = (x: number) => new CatenaryPole({ x, name: String(x), tracks: {} });

function addSection(stores: ReturnType<typeof setup>["stores"], startX: number): AnchorSection {
    const section = new AnchorSection({ startPole: pole(startX) });
    stores.anchorSectionsStore.add(section);
    return section;
}

describe("JunctionService.createJunction", () => {
    it("создаёт сопряжение и ставит первой секцию с меньшим startPole.x", () => {
        const { service, stores } = setup();
        const right = addSection(stores, 500);
        const left = addSection(stores, 100);

        const junction = service.createJunction(right.id, left.id, "insulating");

        expect(junction).not.toBeNull();
        expect(junction!.section1).toBe(left);
        expect(junction!.section2).toBe(right);
        expect(stores.junctionsStore.junctions.get(junction!.id)).toBe(junction);
    });

    it("не создаёт сопряжение с несуществующей или одной и той же АУ", () => {
        const { service, stores } = setup();
        const section = addSection(stores, 100);

        expect(service.createJunction(section.id, section.id, "non-insulating")).toBeNull();
        expect(service.createJunction(section.id, "нет-такого", "non-insulating")).toBeNull();
        expect(stores.junctionsStore.list).toEqual([]);
    });

    it("undo убирает созданное сопряжение", () => {
        const { service, stores, undoStackStore } = setup();
        const s1 = addSection(stores, 100);
        const s2 = addSection(stores, 500);

        const junction = service.createJunction(s1.id, s2.id, "non-insulating")!;
        undoStackStore.undo();

        expect(stores.junctionsStore.junctions.has(junction.id)).toBe(false);
    });
});

describe("JunctionService.deleteJunction", () => {
    it("удаляет сопряжение, undo возвращает его", () => {
        const { service, stores, undoStackStore } = setup();
        const s1 = addSection(stores, 100);
        const s2 = addSection(stores, 500);
        const junction = service.createJunction(s1.id, s2.id, "non-insulating")!;

        service.deleteJunction(junction);
        expect(stores.junctionsStore.junctions.has(junction.id)).toBe(false);

        undoStackStore.undo();
        expect(stores.junctionsStore.junctions.get(junction.id)).toBe(junction);
    });
});

describe("JunctionService — свойства", () => {
    it("имя склеивается в одну команду, тип — отдельная", () => {
        const { service, stores, undoStackStore } = setup();
        const s1 = addSection(stores, 100);
        const s2 = addSection(stores, 500);
        const junction = service.createJunction(s1.id, s2.id, "non-insulating")!;
        const depthBefore = undoStackStore.undoStack.length;

        service.setJunctionName(junction, "С");
        service.setJunctionName(junction, "С-1");
        service.setJunctionType(junction, "insulating");

        expect(junction.name).toBe("С-1");
        expect(junction.type).toBe("insulating");
        expect(undoStackStore.undoStack.length).toBe(depthBefore + 2);

        undoStackStore.undo();
        expect(junction.type).toBe("non-insulating");
        undoStackStore.undo();
        expect(junction.name).toBe("");
    });
});

describe("JunctionService.runAutoDetectJunctions", () => {
    it("заменяет существующие сопряжения найденными; undo возвращает прежние", () => {
        const { service, stores, undoStackStore } = setup();
        const sharedPole = pole(300);
        const s1 = new AnchorSection({ startPole: pole(100), fixingPoints: [new FixingPoint({ pole: sharedPole })] });
        const s2 = new AnchorSection({ startPole: pole(200), fixingPoints: [new FixingPoint({ pole: sharedPole })] });
        stores.anchorSectionsStore.add(s1);
        stores.anchorSectionsStore.add(s2);

        const stale = new Junction({ section1: s1, section2: s2, type: "insulating" });
        stores.junctionsStore.add(stale);

        const count = service.runAutoDetectJunctions();

        expect(count).toBe(1);
        expect(stores.junctionsStore.list).toHaveLength(1);
        expect(stores.junctionsStore.junctions.has(stale.id)).toBe(false);

        undoStackStore.undo();

        expect(stores.junctionsStore.list).toEqual([stale]);
    });

    it("на плане без общих опор очищает список", () => {
        const { service, stores } = setup();
        const s1 = addSection(stores, 100);
        const s2 = addSection(stores, 500);
        stores.junctionsStore.add(new Junction({ section1: s1, section2: s2, type: "non-insulating" }));

        expect(service.runAutoDetectJunctions()).toBe(0);
        expect(stores.junctionsStore.list).toEqual([]);
    });
});

describe("JunctionService — обратная связь", () => {
    it("авто-детект сообщает, сколько сопряжений найдено", () => {
        const { service, notificationService } = setup();

        service.runAutoDetectJunctions();

        expect(notificationService.last?.message).toMatch(/Сопряжений не найдено/);
    });

    it("сопряжение из одной и той же АУ не создаётся и объясняет почему", () => {
        const { service, stores, notificationService } = setup();
        const section = addSection(stores, 0);

        const junction = service.createJunction(section.id, section.id, "insulating");

        expect(junction).toBeNull();
        expect(notificationService.last?.level).toBe("warning");
    });
});
