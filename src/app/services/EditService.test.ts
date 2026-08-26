import { describe, it, expect } from "vitest";

import { RelativeSidePosition } from "@/shared/types/catenaryTypes";
import { CatenaryPole, Railway, Track } from "@/entities/catenaryPlanGraphic";

import { EditService } from "./EditService";
import { TracksStore } from "../store/TracksStore";
import { UndoStackStore } from "../store/UndoStackStore";

import { bindingGabarit, bindingSide, offsetFromGabarit } from "@/entities/catenaryPlanGraphic";
function setup() {
    const railway = new Railway({ name: "R", startX: 0, endX: 10000 });
    const tracksStore = new TracksStore([], railway);
    const undoStackStore = new UndoStackStore();
    const service = new EditService(undoStackStore, tracksStore);

    const track1 = new Track({ railway, name: "1", startX: 0, endX: 10000, yOffsetMeters: 5 });
    const track2 = new Track({ railway, name: "2", startX: 0, endX: 10000, yOffsetMeters: 10 });
    tracksStore.add(track1);
    tracksStore.add(track2);

    const makePole = (name: string) =>
        new CatenaryPole({
            x: 100,
            name,
            trackBindings: [
                {
                    track: track1,
                    offsetMeters: offsetFromGabarit(3.1, RelativeSidePosition.LEFT, track1.directionMultiplier),
                },
            ],
        });

    return { service, undoStackStore, tracksStore, track1, track2, makePole };
}

describe("EditService — одиночная опора", () => {
    it("имя и положение обратимы, серия правок склеивается", () => {
        const { service, undoStackStore, makePole } = setup();
        const pole = makePole("1");

        service.setPoleName(pole, "1а");
        service.setPoleName(pole, "1б");
        service.setPoleX(pole, 150);
        service.setPoleX(pole, 200);

        expect(pole.name).toBe("1б");
        expect(pole.x).toBe(200);
        expect(undoStackStore.undoStack).toHaveLength(2);

        undoStackStore.undo();
        expect(pole.x).toBe(100);
        undoStackStore.undo();
        expect(pole.name).toBe("1");
    });

    it("материал, подкос и заземление обратимы", () => {
        const { service, undoStackStore, makePole } = setup();
        const pole = makePole("1");

        service.setPoleMaterial(pole, "metal");
        service.setPoleAnchorBrace(pole, true);
        service.setPoleGrounding(pole, "ИИ");

        expect(pole.material).toBe("metal");
        expect(pole.anchorBrace).toEqual({ direction: RelativeSidePosition.RIGHT });
        expect(pole.grounding).toBe("ИИ");

        undoStackStore.undo();
        expect(pole.grounding).toBeUndefined();
        undoStackStore.undo();
        expect(pole.anchorBrace).toBeUndefined();
        undoStackStore.undo();
        expect(pole.material).toBe("concrete");
    });

    it("оттяжка: тип, переключение направления и снятие", () => {
        const { service, undoStackStore, makePole } = setup();
        const pole = makePole("1");

        service.setPoleAnchorGuyType(pole, "double");
        expect(pole.anchorGuy).toEqual({ type: "double", direction: RelativeSidePosition.LEFT });

        service.togglePoleAnchorGuyDirection(pole);
        expect(pole.anchorGuy).toEqual({ type: "double", direction: RelativeSidePosition.RIGHT });

        service.setPoleAnchorGuyType(pole, "none");
        expect(pole.anchorGuy).toBeUndefined();

        // без оттяжки переключать нечего — команда не создаётся
        const depth = undoStackStore.undoStack.length;
        service.togglePoleAnchorGuyDirection(pole);
        expect(undoStackStore.undoStack).toHaveLength(depth);

        undoStackStore.undo();
        expect(pole.anchorGuy).toEqual({ type: "double", direction: RelativeSidePosition.RIGHT });
    });

    it("габарит, сторона и привязки к путям правятся через сервис", () => {
        const { service, undoStackStore, track1, track2, makePole } = setup();
        const pole = makePole("1");

        service.setPoleTrackGabarit(pole, track1.id, 4.9);
        expect(bindingGabarit(pole.getBinding(track1.id)!)).toBe(4.9);

        service.togglePoleTrackDirection(pole, track1.id);
        expect(bindingSide(pole.getBinding(track1.id)!)).toBe(RelativeSidePosition.RIGHT);

        service.addPoleTrack(pole, track2.id);
        expect(pole.hasTrack(track2.id)).toBe(true);

        service.removePoleTrack(pole, track2.id);
        expect(pole.hasTrack(track2.id)).toBe(false);

        undoStackStore.undo();
        expect(pole.hasTrack(track2.id)).toBe(true);
        undoStackStore.undo();
        expect(pole.hasTrack(track2.id)).toBe(false);
        undoStackStore.undo();
        expect(bindingSide(pole.getBinding(track1.id)!)).toBe(RelativeSidePosition.LEFT);
        undoStackStore.undo();
        expect(bindingGabarit(pole.getBinding(track1.id)!)).toBe(3.1);
    });

    it("повторная привязка к тому же пути и правка чужого пути ничего не делают", () => {
        const { service, undoStackStore, track1, track2, makePole } = setup();
        const pole = makePole("1");

        service.addPoleTrack(pole, track1.id);
        service.removePoleTrack(pole, track2.id);
        service.setPoleTrackGabarit(pole, track2.id, 5);
        service.togglePoleTrackDirection(pole, track2.id);

        expect(undoStackStore.undoStack).toHaveLength(0);
    });
});

describe("EditService — мультивыделение", () => {
    it("правит все опоры одной командой", () => {
        const { service, undoStackStore, makePole } = setup();
        const poles = [makePole("1"), makePole("2"), makePole("3")];

        service.setBulkMaterial(poles, "metal");

        expect(poles.every((p) => p.material === "metal")).toBe(true);
        expect(undoStackStore.undoStack).toHaveLength(1);
        expect(undoStackStore.lastDescription).toBe("Изменён материал для 3 опор");

        undoStackStore.undo();
        expect(poles.every((p) => p.material === "concrete")).toBe(true);
    });

    it("считает только опоры, к которым правка применима", () => {
        const { service, undoStackStore, track1, track2, makePole } = setup();
        const bound = makePole("1");
        const other = new CatenaryPole({
            x: 200,
            name: "2",
            trackBindings: [
                {
                    track: track2,
                    offsetMeters: offsetFromGabarit(3.1, RelativeSidePosition.LEFT, track2.directionMultiplier),
                },
            ],
        });

        service.setBulkTrackGabarit([bound, other], track1.id, 4.5);

        expect(bindingGabarit(bound.getBinding(track1.id)!)).toBe(4.5);
        expect(undoStackStore.lastDescription).toBe("Изменён габарит для 1 опор");
    });

    it("удаление единственной привязки к пути пропускается", () => {
        const { service, undoStackStore, track1, makePole } = setup();
        const pole = makePole("1");

        service.removeBulkTrack([pole], track1.id);

        expect(pole.hasTrack(track1.id)).toBe(true);
        expect(undoStackStore.undoStack).toHaveLength(0);
    });

    it("перенос привязки на другой путь обратим", () => {
        const { service, undoStackStore, track1, track2, makePole } = setup();
        const pole = makePole("1");

        service.reassignBulkTrack([pole], track1.id, track2.id);

        expect(pole.hasTrack(track1.id)).toBe(false);
        expect(pole.hasTrack(track2.id)).toBe(true);

        undoStackStore.undo();
        expect(pole.hasTrack(track1.id)).toBe(true);
        expect(pole.hasTrack(track2.id)).toBe(false);
    });
});
