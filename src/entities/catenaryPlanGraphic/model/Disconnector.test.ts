import { describe, it, expect } from "vitest";

import { CatenaryPole } from "./CatenaryPole";
import { Disconnector } from "./Disconnector";

const pole = new CatenaryPole({ x: 100, name: "1", tracks: {} }); // pos {100, 0}

const make = () =>
    new Disconnector({ name: "Р1", pole, controlType: "manual", state: "off", phaseCount: 1, yOffset: 20 });

describe("Disconnector", () => {
    it("pos = позиция опоры + yOffset по Y", () => {
        expect(make().pos).toEqual({ x: 100, y: 20 });
    });

    it("сеттеры обновляют поля", () => {
        const d = make();
        d.setState("on");
        d.setControlType("remote");
        d.setPhaseCount(3);
        d.setYOffset(40);
        d.setWireLineId("wl1");
        expect([d.state, d.controlType, d.phaseCount, d.pos.y, d.wireLineId]).toEqual(["on", "remote", 3, 40, "wl1"]);
    });
});
