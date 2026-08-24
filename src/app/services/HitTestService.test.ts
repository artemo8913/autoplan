import { describe, it, expect } from "vitest";

import { CatenaryPole, FixingPoint, VlPole, WireLine } from "@/entities/catenaryPlanGraphic";
import type { ViewBox } from "@/shared/types/toolTypes";

import { HitTestService } from "./HitTestService";
import { CatenaryPoleStore } from "../store/CatenaryPoleStore";
import { VlPolesStore } from "../store/VlPolesStore";
import { FixingPointsStore } from "../store/FixingPointsStore";
import { WireLinesStore } from "../store/WireLinesStore";
import { AnchorSectionsStore } from "../store/AnchorSectionsStore";
import { CrossSpansStore } from "../store/CrossSpansStore";
import { DisconnectorsStore } from "../store/DisconnectorsStore";
import type { DisplaySettingsStore } from "../store/DisplaySettingsStore";

const VIEWBOX: ViewBox = { x: 0, y: 0, width: 100, height: 100 };
const CLIENT_W = 100; // svgPerPx = 1

interface Stores {
    poles?: CatenaryPole[];
    vlPoles?: VlPole[];
    fps?: FixingPoint[];
    wires?: WireLine[];
}

function makeService(s: Stores = {}) {
    const catenaryPoleStore = new CatenaryPoleStore(s.poles ?? []);
    return {
        catenaryPoleStore,
        service: new HitTestService(
            catenaryPoleStore,
            new VlPolesStore(s.vlPoles ?? []),
            new FixingPointsStore(s.fps ?? []),
            new WireLinesStore(s.wires ?? []),
            new AnchorSectionsStore([]),
            new CrossSpansStore([]),
            new DisconnectorsStore([]),
            null as unknown as DisplaySettingsStore, // не используется в hitTest/hitTestRect
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
