import { describe, it, expect } from "vitest";

import { AnchorSection, Junction } from "@/entities/catenaryPlanGraphic";

import { junctionDisplayName } from "./junctionDisplayName";

function junctionOf(name1: string, name2: string) {
    const section1 = new AnchorSection({ name: name1 });
    const section2 = new AnchorSection({ name: name2 });
    return new Junction({ section1, section2, type: "non-insulating" });
}

describe("junctionDisplayName", () => {
    it("приоритет у собственного имени сопряжения", () => {
        const j = junctionOf("A", "B");
        j.setName("Сопряжение 7");
        expect(junctionDisplayName(j)).toBe("Сопряжение 7");
    });

    it("без имени — комбинирует имена секций", () => {
        expect(junctionDisplayName(junctionOf("АУ-1", "АУ-2"))).toBe("АУ-1 ↔ АУ-2");
    });

    it("пустые имена секций → фолбэк «АУ»", () => {
        expect(junctionDisplayName(junctionOf("", ""))).toBe("АУ ↔ АУ");
    });
});
