import { describe, it, expect } from "vitest";

import {
    AnchorSection,
    CatenaryPole,
    FixingPoint,
    Junction,
    Railway,
    Track,
    VlPole,
    WireLine,
    poleLabelPos,
    sectionOverlapRanges,
    spanLabelLayout,
    zigzagDrawOffset,
    zigzagLabelPos,
} from "@/entities/catenaryPlanGraphic";
import type { ViewBox } from "@/shared/types/toolTypes";

import { HitTestService } from "./HitTestService";
import { CatenaryPoleStore } from "../store/CatenaryPoleStore";
import { VlPolesStore } from "../store/VlPolesStore";
import { FixingPointsStore } from "../store/FixingPointsStore";
import { WireLinesStore } from "../store/WireLinesStore";
import { AnchorSectionsStore } from "../store/AnchorSectionsStore";
import { JunctionsStore } from "../store/JunctionsStore";
import { CrossSpansStore } from "../store/CrossSpansStore";
import { DisconnectorsStore } from "../store/DisconnectorsStore";
import { DisplaySettingsStore } from "../store/DisplaySettingsStore";

const VIEWBOX: ViewBox = { x: 0, y: 0, width: 100, height: 100 };
const CLIENT_W = 100; // svgPerPx = 1

interface Stores {
    poles?: CatenaryPole[];
    vlPoles?: VlPole[];
    fps?: FixingPoint[];
    wires?: WireLine[];
    sections?: AnchorSection[];
    junctions?: Junction[];
}

function makeService(s: Stores = {}) {
    const catenaryPoleStore = new CatenaryPoleStore(s.poles ?? []);
    const display = new DisplaySettingsStore();
    return {
        catenaryPoleStore,
        display,
        service: new HitTestService(
            catenaryPoleStore,
            new VlPolesStore(s.vlPoles ?? []),
            new FixingPointsStore(s.fps ?? []),
            new WireLinesStore(s.wires ?? []),
            new AnchorSectionsStore(s.sections ?? []),
            new JunctionsStore(s.junctions ?? []),
            new CrossSpansStore([]),
            new DisconnectorsStore([]),
            display,
        ),
    };
}

const pole = (x: number, name = String(x)) => new CatenaryPole({ x, name, trackBindings: [] }); // pos {x, 0}

describe("HitTestService.hitTest — приоритеты", () => {
    it("ТФ перекрывает опору в той же точке", () => {
        const cp = pole(0);
        const fp = new FixingPoint({ pole: cp }); // startPos = (0,0)
        const { service } = makeService({ poles: [cp], fps: [fp] });

        const r = service.hitTest({ x: 0, y: 0 }, { x: 0, y: 0 }, VIEWBOX, CLIENT_W);
        expect(r.entity).toEqual({ id: fp.id, type: "fixingPoint" });
        expect(r.fixingPoint?.id).toBe(fp.id);
    });

    it("опора, когда ТФ нет", () => {
        const cp = pole(0);
        const { service } = makeService({ poles: [cp] });
        // entity — чистый { id, type } без внутреннего dist
        expect(service.hitTest({ x: 0, y: 0 }, { x: 0, y: 0 }, VIEWBOX, CLIENT_W).entity).toEqual({
            id: cp.id,
            type: "catenaryPole",
        });
    });

    it("опора ВЛ", () => {
        const vl = new VlPole({ x: 50, y: 0, name: "В1", vlType: "intermediate" });
        const { service } = makeService({ vlPoles: [vl] });
        expect(service.hitTest({ x: 50, y: 0 }, { x: 0, y: 0 }, VIEWBOX, CLIENT_W).entity).toEqual({
            id: vl.id,
            type: "vlPole",
        });
    });

    it("провод (когда опоры/ТФ не мешают)", () => {
        const wireFp = new FixingPoint({ pole: pole(200), yOffset: 40 }); // сегмент (200,0)-(200,40)
        const wire = new WireLine({ wireType: "vl", fixingPoints: [wireFp] });
        const { service } = makeService({ wires: [wire] }); // опора в стор НЕ добавлена
        expect(service.hitTest({ x: 200, y: 20 }, { x: 0, y: 0 }, VIEWBOX, CLIENT_W).entity).toEqual({
            id: wire.id,
            type: "wireLine",
        });
    });

    it("промах → entity null", () => {
        const { service } = makeService({ poles: [pole(0)] });
        expect(service.hitTest({ x: 1000, y: 1000 }, { x: 0, y: 0 }, VIEWBOX, CLIENT_W).entity).toBeNull();
    });
});

describe("HitTestService.hitTestRect", () => {
    it("возвращает опоры внутри прямоугольника", () => {
        const inside = pole(10);
        const outside = pole(100);
        const { service } = makeService({ poles: [inside, outside] });
        const result = service.hitTestRect({ x: 0, y: -5 }, { x: 50, y: 5 });
        expect(result).toEqual([{ id: inside.id, type: "catenaryPole" }]);
    });
});

describe("HitTestService.findClosestCatenaryPole", () => {
    it("ближайшая опора и yOffset до неё", () => {
        const a = pole(0);
        const b = pole(100);
        const { service } = makeService({ poles: [a, b] });
        expect(service.findClosestCatenaryPole({ x: 90, y: 5 })).toEqual({ id: b.id, yOffset: 5 });
    });

    it("null без опор", () => {
        const { service } = makeService();
        expect(service.findClosestCatenaryPole({ x: 0, y: 0 })).toBeNull();
    });
});

/**
 * Ниже — контракт п. 6.2: hit-test обязан ходить по тем же формулам и по тому же
 * дедуплицированному списку, что и слои. Ожидаемые точки берутся из labelLayout,
 * то есть из того же кода, которым рисуют CatenaryLayer/ZigzagLayer/SpanLengthLayer.
 */
describe("HitTestService.hitTestEditTarget", () => {
    const railway = () => new Railway({ name: "R", startX: 0, endX: 10000 });

    it("подпись опоры — в точке, где её рисует PoleLayer", () => {
        const p = pole(0);
        const { service, display } = makeService({ poles: [p] });

        const expected = poleLabelPos(p, display);
        const hit = service.hitTestEditTarget(expected);

        expect(hit?.editTarget).toEqual({ kind: "poleName", poleId: p.id });
        expect(hit?.svgPos).toEqual(expected);
        expect(service.hitTestEditTarget({ x: expected.x, y: expected.y + 100 })).toBeNull();
    });

    it("подпись зигзага учитывает смещение в зоне сопряжения", () => {
        const startPole = pole(0);
        const midPole = pole(100);
        const endPole = pole(300);
        const otherStart = pole(50);
        const otherEnd = pole(400);

        const fpMid = new FixingPoint({ pole: midPole, yOffset: 50, zigzagValue: 300 });
        const section = new AnchorSection({
            startPole,
            endPole,
            fixingPoints: [new FixingPoint({ pole: startPole }), fpMid, new FixingPoint({ pole: endPole })],
        });
        const other = new AnchorSection({ startPole: otherStart, endPole: otherEnd });
        const junction = new Junction({ section1: section, section2: other, type: "insulating" });

        const { service, display } = makeService({
            poles: [startPole, midPole, endPole],
            fps: [fpMid],
            sections: [section, other],
            junctions: [junction],
        });

        const ranges = sectionOverlapRanges(section.id, [junction]);
        expect(ranges).toEqual([{ start: 50, end: 300 }]);

        const offset = zigzagDrawOffset(fpMid, ranges, display.zigzagDrawScale);
        expect(offset).not.toBe(0);

        const expected = zigzagLabelPos(fpMid, display, offset);
        const hit = service.hitTestEditTarget(expected);

        expect(hit?.editTarget).toEqual({ kind: "zigzagValue", fixingPointId: fpMid.id });
        expect(hit?.svgPos).toEqual(expected);
    });

    it("общий пролёт двух АУ: клик попадает в ту пару ТФ, что нарисована", () => {
        const track = new Track({ railway: railway(), name: "1", startX: 0, endX: 10000, yOffsetMeters: 5 });

        const shared1 = pole(100);
        const shared2 = pole(200);
        const left = new FixingPoint({ pole: shared1, track });
        const right = new FixingPoint({ pole: shared2, track });
        // Второй АУ ссылается на те же опоры своими ТФ — именно они раньше перехватывали клик
        const dupLeft = new FixingPoint({ pole: shared1, track });
        const dupRight = new FixingPoint({ pole: shared2, track });

        const s1 = new AnchorSection({ fixingPoints: [left, right] });
        const s2 = new AnchorSection({ fixingPoints: [dupLeft, dupRight] });

        const { service, display } = makeService({
            poles: [shared1, shared2],
            fps: [left, right, dupLeft, dupRight],
            sections: [s1, s2],
        });

        const { pos } = spanLabelLayout(left, right, display);
        const hit = service.hitTestEditTarget(pos);

        expect(hit?.editTarget).toEqual({
            kind: "spanLength",
            leftFpId: left.id,
            rightFpId: right.id,
            trackId: track.id,
        });
        expect(hit?.initialValue).toBe("100");
    });

    it("не открывает редактор на месте отброшенного дубля из соседней АУ", () => {
        const shared1 = pole(100);
        const shared2 = pole(200);

        // Нарисована пара первой АУ (её ТФ без пути), а хит-тест раньше проваливался
        // на дубль второй АУ и находил подпись там, где на экране ничего нет.
        const left = new FixingPoint({ pole: shared1, yOffset: 50 });
        const right = new FixingPoint({ pole: shared2, yOffset: 50 });

        const otherTrack = new Track({ railway: railway(), name: "2", startX: 0, endX: 10000, yOffsetMeters: -5 });
        const dupLeft = new FixingPoint({ pole: shared1, track: otherTrack });
        const dupRight = new FixingPoint({ pole: shared2, track: otherTrack });

        const s1 = new AnchorSection({ fixingPoints: [left, right] });
        const s2 = new AnchorSection({ fixingPoints: [dupLeft, dupRight] });

        const { service, display } = makeService({
            poles: [shared1, shared2],
            fps: [left, right, dupLeft, dupRight],
            sections: [s1, s2],
        });

        const drawn = spanLabelLayout(left, right, display).pos;
        const phantom = spanLabelLayout(dupLeft, dupRight, display).pos;
        expect(phantom).not.toEqual(drawn);

        expect(service.hitTestEditTarget(phantom)).toBeNull();
    });
});
