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

/** План версии 1: у привязки опоры ещё пара «габарит + сторона». */
function planV1() {
    return {
        ...legacyPlan(),
        version: 1,
        tracks: [
            { id: "t-even", name: "2", startX: 0, endX: 10000, yOffsetMeters: 5 },
            { id: "t-odd", name: "1", startX: 0, endX: 10000, yOffsetMeters: -5 },
        ],
        catenaryPoles: [
            {
                id: "p1",
                x: 100,
                name: "1",
                radius: 12,
                material: "concrete",
                isInsulatingJunctionAnchor: false,
                trackBindings: [
                    { trackId: "t-even", gabarit: 3.1, relativePositionToTrack: 1 },
                    { trackId: "t-odd", gabarit: 5.7, relativePositionToTrack: 1 },
                ],
            },
        ],
    };
}

describe("migratePlanDTO 1 → 2: знаковый габарит", () => {
    it("сторона по ходу движения сворачивается в знак смещения", () => {
        const result = migratePlanDTO(planV1());

        expect(result.ok).toBe(true);
        if (!result.ok) {
            return;
        }
        expect(result.dto.version).toBe(CURRENT_PLAN_VERSION);
        // правая сторона на чётном пути (dirMult +1) — это «вниз по чертежу», знак «+»
        // на нечётном (dirMult −1) та же правая сторона — «вверх», знак «−»
        expect(result.dto.catenaryPoles[0].trackBindings).toEqual([
            { trackId: "t-even", offsetMeters: 3.1 },
            { trackId: "t-odd", offsetMeters: -5.7 },
        ]);
    });

    it("не трогает остальные поля опоры", () => {
        const result = migratePlanDTO(planV1());

        expect(result.ok).toBe(true);
        if (!result.ok) {
            return;
        }
        expect(result.dto.catenaryPoles[0]).toMatchObject({ id: "p1", x: 100, name: "1", material: "concrete" });
    });

    it("привязка к несуществующему пути не роняет миграцию", () => {
        const plan = planV1();
        plan.catenaryPoles[0].trackBindings = [{ trackId: "нет-такого", gabarit: 3.1, relativePositionToTrack: -1 }];

        const result = migratePlanDTO(plan);

        expect(result.ok).toBe(true);
        if (!result.ok) {
            return;
        }
        expect(result.dto.catenaryPoles[0].trackBindings).toEqual([{ trackId: "нет-такого", offsetMeters: -3.1 }]);
    });

    it("план без версии проходит всю лесенку: 0 → 1 → 2", () => {
        const plan = planV1();
        delete (plan as Partial<ReturnType<typeof planV1>>).version;

        const result = migratePlanDTO(plan);

        expect(result.ok).toBe(true);
        if (!result.ok) {
            return;
        }
        expect(result.migratedFrom).toBe(0);
        expect(result.dto.catenaryPoles[0].trackBindings).toEqual([
            { trackId: "t-even", offsetMeters: 3.1 },
            { trackId: "t-odd", offsetMeters: -5.7 },
        ]);
    });
});

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
