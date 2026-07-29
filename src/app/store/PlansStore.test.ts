import { describe, it, expect } from "vitest";

import type { PlanMeta } from "@/shared/types/planTypes";

import { PlansStore } from "./PlansStore";

const meta = (id: string, updatedAt: string): PlanMeta => ({
    id,
    name: `План ${id}`,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt,
});

describe("PlansStore", () => {
    it("add / get / remove", () => {
        const s = new PlansStore();
        const m = meta("1", "2026-01-01T00:00:00.000Z");

        s.add(m);
        expect(s.get("1")).toEqual(m);

        s.remove("1");
        expect(s.get("1")).toBeUndefined();
    });

    it("list отсортирован по updatedAt по убыванию", () => {
        const s = new PlansStore();
        s.add(meta("old", "2026-01-01T00:00:00.000Z"));
        s.add(meta("new", "2026-03-01T00:00:00.000Z"));
        s.add(meta("mid", "2026-02-01T00:00:00.000Z"));

        expect(s.list.map((m) => m.id)).toEqual(["new", "mid", "old"]);
    });

    it("setJustUpdated обновляет updatedAt и поднимает план наверх", () => {
        const s = new PlansStore();
        s.add(meta("a", "2026-01-01T00:00:00.000Z"));
        s.add(meta("b", "2026-02-01T00:00:00.000Z"));

        s.setJustUpdated("a");

        expect(s.list[0].id).toBe("a");
        expect(s.get("a")!.updatedAt).not.toBe("2026-01-01T00:00:00.000Z");
    });

    it("setJustUpdated по неизвестному id — no-op", () => {
        const s = new PlansStore();
        expect(() => s.setJustUpdated("missing")).not.toThrow();
        expect(s.list).toHaveLength(0);
    });
});
