import { describe, it, expect } from "vitest";

import type { DeletionCounts } from "./cascadeRules";
import { describeDeletion, describeTrackDetach, plural, totalDeletionCount } from "./deletionMessages";

function counts(partial: Partial<DeletionCounts>): DeletionCounts {
    return {
        poles: 0,
        vlPoles: 0,
        crossSpans: 0,
        disconnectors: 0,
        fixingPoints: 0,
        anchorSections: 0,
        wireLines: 0,
        junctions: 0,
        tracks: 0,
        ...partial,
    };
}

describe("plural", () => {
    it("склоняет по последней цифре", () => {
        expect(plural(1, "опора", "опоры", "опор")).toBe("опора");
        expect(plural(3, "опора", "опоры", "опор")).toBe("опоры");
        expect(plural(5, "опора", "опоры", "опор")).toBe("опор");
        expect(plural(21, "опора", "опоры", "опор")).toBe("опора");
    });

    it("11–14 — исключение", () => {
        expect(plural(11, "опора", "опоры", "опор")).toBe("опор");
        expect(plural(14, "опора", "опоры", "опор")).toBe("опор");
        expect(plural(112, "опора", "опоры", "опор")).toBe("опор");
    });
});

describe("describeDeletion", () => {
    it("перечисляет только непустые типы в фиксированном порядке", () => {
        expect(describeDeletion(counts({ poles: 2, fixingPoints: 5, junctions: 1 }))).toEqual([
            "опоры КС: 2",
            "сопряжение: 1",
            "точек фиксации: 5",
        ]);
    });

    it("пустое удаление описывать нечем", () => {
        expect(describeDeletion(counts({}))).toEqual([]);
        expect(totalDeletionCount(counts({}))).toBe(0);
        expect(totalDeletionCount(counts({ poles: 2, tracks: 1 }))).toBe(3);
    });
});

describe("describeTrackDetach", () => {
    it("сообщает только про то, что реально теряет привязку", () => {
        expect(describeTrackDetach({ poles: 3, fixingPoints: 0 })).toEqual(["Опоры потеряют привязку к пути: 3"]);
        expect(describeTrackDetach({ poles: 0, fixingPoints: 0 })).toEqual([]);
        expect(describeTrackDetach({ poles: 1, fixingPoints: 2 })).toHaveLength(2);
    });
});
