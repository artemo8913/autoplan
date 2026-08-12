import { describe, it, expect } from "vitest";

import { CURRENT_PLAN_VERSION, migratePlanDTO } from "./planMigrations";

/** Минимальный «старый» план: до введения версий поле version не писалось. */
function legacyPlan() {
    return {
        id: "plan-1",
        name: "Plan",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
        railway: { name: "R", startX: 0, endX: 10000 },
        tracks: [],
        catenaryPoles: [],
        vlPoles: [],
        fixingPoints: [],
        anchorSections: [],
        junctions: [],
        wireLines: [],
    };
}

describe("migratePlanDTO", () => {
    it("проставляет версию плану, сохранённому до её введения", () => {
        const result = migratePlanDTO(legacyPlan());

        expect(result.ok).toBe(true);
        if (!result.ok) {
            return;
        }
        expect(result.dto.version).toBe(CURRENT_PLAN_VERSION);
        expect(result.migratedFrom).toBe(0);
    });

    it("сохраняет остальные поля при миграции", () => {
        const result = migratePlanDTO(legacyPlan());

        expect(result.ok).toBe(true);
        if (!result.ok) {
            return;
        }
        expect(result.dto).toMatchObject({ id: "plan-1", name: "Plan", railway: { startX: 0, endX: 10000 } });
    });

    it("не мутирует исходный объект", () => {
        const source = legacyPlan();
        migratePlanDTO(source);

        expect("version" in source).toBe(false);
    });

    it("пропускает план текущей версии без миграции", () => {
        const result = migratePlanDTO({ ...legacyPlan(), version: CURRENT_PLAN_VERSION });

        expect(result.ok).toBe(true);
        if (!result.ok) {
            return;
        }
        expect(result.dto.version).toBe(CURRENT_PLAN_VERSION);
        expect(result.migratedFrom).toBeNull();
    });

    it("отклоняет план из более новой версии программы", () => {
        const result = migratePlanDTO({ ...legacyPlan(), version: CURRENT_PLAN_VERSION + 1 });

        expect(result.ok).toBe(false);
        if (result.ok) {
            return;
        }
        expect(result.reason).toContain("более новой версии");
    });

    it.each([
        ["null", null],
        ["строка", "не план"],
        ["массив", []],
        ["число", 42],
    ])("отклоняет значение, не похожее на план: %s", (_label, raw) => {
        const result = migratePlanDTO(raw);

        expect(result.ok).toBe(false);
    });

    it.each([
        ["дробная", 1.5],
        ["отрицательная", -1],
        ["строковая", "1"],
    ])("отклоняет некорректную версию: %s", (_label, version) => {
        const result = migratePlanDTO({ ...legacyPlan(), version });

        expect(result.ok).toBe(false);
        if (result.ok) {
            return;
        }
        expect(result.reason).toContain("Некорректная версия");
    });
});
