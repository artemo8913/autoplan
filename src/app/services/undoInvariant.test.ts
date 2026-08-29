import { describe, it } from "vitest";

import { CatenaryType, RelativeSidePosition } from "@/shared/types/catenaryTypes";
import { CatenaryPole, Railway, Track, VlPole } from "@/entities/catenaryPlanGraphic";

import { UndoStackStore } from "../store/UndoStackStore";
import { EntityService } from "./EntityService";
import { EditService } from "./EditService";
import { CrossSpanService } from "./CrossSpanService";
import { LinesService } from "./LinesService";
import { JunctionService } from "./JunctionService";
import { TrackService } from "./TrackService";
import { MemoryNotificationService } from "./NotificationService";
import { makePlanEntityStores } from "./planStores.test-helper";
import { expectUndoRestoresPlan } from "./undoInvariant.test-helper";

import { offsetFromGabarit } from "@/entities/catenaryPlanGraphic";
/**
 * Инвариант обратимости для операций, где ручная инверсия дороже всего (каскады, массовые правки).
 * Смысл — см. решение по п. 5.1 в CLAUDE.md: undo остаётся на командах, поэтому обратимость
 * держится тестом, а не формой хранения.
 */
function setup() {
    const railway = new Railway({ name: "Участок", startX: 0, endX: 10000 });
    const stores = makePlanEntityStores(railway);
    const undoStackStore = new UndoStackStore();
    const notificationService = new MemoryNotificationService();

    const services = {
        entityService: new EntityService(stores, undoStackStore, notificationService),
        editService: new EditService(undoStackStore, stores.tracksStore),
        crossSpanService: new CrossSpanService(undoStackStore),
        linesService: new LinesService(stores, undoStackStore),
        junctionService: new JunctionService(stores, undoStackStore, notificationService),
        trackService: new TrackService(stores, undoStackStore),
    };

    const track1 = new Track({ railway, name: "I", startX: 0, endX: 10000, yOffsetMeters: -5 });
    const track2 = new Track({ railway, name: "II", startX: 0, endX: 10000, yOffsetMeters: 5 });
    stores.tracksStore.add(track1);
    stores.tracksStore.add(track2);

    // 8 опор КС, две АУ с перекрытием по общей опоре, сопряжение, линия ВЛ, поперечина, разъединитель
    const poles = Array.from({ length: 8 }, (_, i) => {
        const track = i % 2 === 0 ? track1 : track2;
        const pole = new CatenaryPole({
            x: i * 60,
            name: `${i + 1}`,
            trackBindings: [{ track, offsetMeters: offsetFromGabarit(3.1, RelativeSidePosition.LEFT, track.directionMultiplier) }],
        });
        stores.catenaryPoleStore.add(pole);
        return pole;
    });

    const vlPole = new VlPole({ x: 300, y: 40, name: "ВЛ-1", vlType: "intermediate" });
    stores.vlPolesStore.add(vlPole);

    const sectionA = services.linesService.createAnchorSection();
    const sectionB = services.linesService.createAnchorSection();
    services.linesService.setAnchorSectionType(sectionA, CatenaryType.CS120);
    services.linesService.setAnchorSectionPrimaryTrack(sectionA, track1);
    poles.slice(0, 5).forEach((pole) => services.linesService.addFixingPoint(sectionA, { pole, track: track1 }));
    poles.slice(4).forEach((pole) => services.linesService.addFixingPoint(sectionB, { pole, track: track2 }));
    services.linesService.setAnchorSectionStartPole(sectionA, poles[0]);
    services.linesService.setAnchorSectionEndPole(sectionA, poles[4]);

    const wireLine = services.linesService.createWireLine("feeding_25");
    services.linesService.addFixingPoint(wireLine, { pole: poles[1], yOffset: 8 });
    services.linesService.addFixingPoint(wireLine, { pole: vlPole, yOffset: 8 });

    services.entityService.createCrossSpan("rigid", poles[2].id, poles[3].id);
    services.entityService.createDisconnector(poles[1].id, { controlType: "manual", phaseCount: 1 }, 7);
    services.junctionService.createJunction(sectionA.id, sectionB.id, "insulating");

    undoStackStore.clear();

    return { stores, undoStackStore, services, poles, vlPole, track1, track2, sectionA, sectionB, wireLine };
}

describe("инвариант обратимости: undo возвращает план в исходный DTO", () => {
    it("каскадное удаление опоры (ТФ + поперечина + разъединитель)", () => {
        const { stores, undoStackStore, services, poles } = setup();
        expectUndoRestoresPlan(stores, undoStackStore, () => services.entityService.deleteEntities([poles[1].id]));
    });

    it("каскадное удаление опоры на границе двух АУ", () => {
        const { stores, undoStackStore, services, poles } = setup();
        expectUndoRestoresPlan(stores, undoStackStore, () => services.entityService.deleteEntities([poles[4].id]));
    });

    it("удаление нескольких сущностей разом", () => {
        const { stores, undoStackStore, services, poles, vlPole } = setup();
        expectUndoRestoresPlan(stores, undoStackStore, () =>
            services.entityService.deleteEntities([poles[2].id, poles[3].id, vlPole.id]),
        );
    });

    it("удаление АУ (ТФ + сопряжение)", () => {
        const { stores, undoStackStore, services, sectionA } = setup();
        expectUndoRestoresPlan(stores, undoStackStore, () => services.linesService.deleteAnchorSection(sectionA));
    });

    it("удаление линии ВЛ", () => {
        const { stores, undoStackStore, services, wireLine } = setup();
        expectUndoRestoresPlan(stores, undoStackStore, () => services.linesService.deleteWireLine(wireLine));
    });

    it("удаление пути (отвязка опор, ТФ и primaryTrack у АУ)", () => {
        const { stores, undoStackStore, services, track1 } = setup();
        expectUndoRestoresPlan(stores, undoStackStore, () => services.trackService.deleteTrack(track1));
    });

    it("авто-детект сопряжений поверх существующих", () => {
        const { stores, undoStackStore, services } = setup();
        expectUndoRestoresPlan(stores, undoStackStore, () => services.junctionService.runAutoDetectJunctions());
    });

    it("массовая перепривязка опор к другому пути", () => {
        const { stores, undoStackStore, services, poles, track1, track2 } = setup();
        expectUndoRestoresPlan(stores, undoStackStore, () =>
            services.editService.reassignBulkTrack(poles, track1.id, track2.id),
        );
    });

    it("массовое добавление и снятие пути у опор", () => {
        const { stores, undoStackStore, services, poles, track2 } = setup();
        expectUndoRestoresPlan(stores, undoStackStore, () => services.editService.addBulkTrack(poles, track2.id));
        expectUndoRestoresPlan(stores, undoStackStore, () => services.editService.removeBulkTrack(poles, track2.id));
    });

    it("смена главного пути опоры", () => {
        const { stores, undoStackStore, services, poles, track2 } = setup();
        const pole = poles[0];
        services.editService.addPoleTrack(pole, track2.id);
        undoStackStore.clear();

        expectUndoRestoresPlan(stores, undoStackStore, () =>
            services.editService.setPolePrimaryTrack(pole, track2.id),
        );
    });

    it("правка габарита на опоре с двумя путями (пересчёт соседнего пути обратим)", () => {
        const { stores, undoStackStore, services, poles, track1, track2 } = setup();
        const pole = poles[0];
        services.editService.addPoleTrack(pole, track2.id);
        undoStackStore.clear();

        expectUndoRestoresPlan(stores, undoStackStore, () =>
            services.editService.setPoleTrackGabarit(pole, track1.id, 4.7),
        );
        expectUndoRestoresPlan(stores, undoStackStore, () =>
            services.editService.togglePoleTrackDirection(pole, track1.id),
        );
    });

    it("массовая правка характеристик поперечин", () => {
        const { stores, undoStackStore, services } = setup();
        const crossSpans = stores.crossSpansStore.list;

        expectUndoRestoresPlan(stores, undoStackStore, () => {
            services.crossSpanService.setBulkSpanType(crossSpans, "flexible");
            services.crossSpanService.setBulkMark(crossSpans, "ПБСМ-70");
            services.crossSpanService.setBulkLoadKn(crossSpans, 12.5);
        });
    });

    it("массовое создание опор", () => {
        const { stores, undoStackStore, services, track1 } = setup();
        expectUndoRestoresPlan(stores, undoStackStore, () =>
            services.entityService.bulkCreateCatenaryPoles(
                [
                    { name: "101", x: 700, trackId: track1.id, gabarit: 3.1, side: RelativeSidePosition.LEFT },
                    { name: "102", x: 760, trackId: track1.id, gabarit: 3.2, side: RelativeSidePosition.RIGHT },
                ]),
        );
    });

    it("массовое добавление ТФ в АУ", () => {
        const { stores, undoStackStore, services, sectionB, poles } = setup();
        expectUndoRestoresPlan(stores, undoStackStore, () =>
            services.linesService.bulkAddFixingPoints(sectionB, [{ pole: poles[0] }, { pole: poles[1] }]),
        );
    });

    it("перемещение ТФ внутри АУ", () => {
        const { stores, undoStackStore, services, sectionA } = setup();
        const fpId = sectionA.fixingPoints[2].id;
        expectUndoRestoresPlan(stores, undoStackStore, () =>
            services.linesService.moveFixingPoint(sectionA, fpId, "up"),
        );
    });
});
