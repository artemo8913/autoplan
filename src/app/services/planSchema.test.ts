import { describe, it, expect } from "vitest";

import type { PlanDTO } from "@/shared/types/planTypes";
import { CatenaryType } from "@/shared/types/catenaryTypes";

import { validatePlanDTO } from "./planSchema";
import { CURRENT_PLAN_VERSION } from "./planMigrations";

function makeDto(overrides: Partial<PlanDTO> = {}): PlanDTO {
    return {
        id: "plan-1",
        name: "План",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        version: CURRENT_PLAN_VERSION,
        railway: { name: "Участок", startX: 0, endX: 1000 },
        tracks: [{ id: "t1", name: "1", startX: 0, endX: 1000, yOffsetMeters: 5 }],
        catenaryPoles: [
            {
                id: "p1",
                x: 100,
                name: "1",
                radius: 0.3,
                material: "concrete",
                isInsulatingJunctionAnchor: false,
                trackBindings: [{ trackId: "t1", offsetMeters: -3.1 }],
            },
        ],
        vlPoles: [],
        fixingPoints: [{ id: "fp1", poleId: "p1", trackId: "t1", yOffset: 0 }],
        anchorSections: [{ id: "as1", type: CatenaryType.CS120, fixingPointIds: ["fp1"], startPoleId: "p1" }],
        junctions: [],
        wireLines: [],
        ...overrides,
    };
}

describe("validatePlanDTO", () => {
    it("пропускает корректный план", () => {
        const result = validatePlanDTO(makeDto());

        expect(result.ok).toBe(true);
    });

    it("не теряет поля, которых нет в схеме (план новее нашего кода)", () => {
        const result = validatePlanDTO({ ...makeDto(), futureField: 42 });

        expect(result.ok).toBe(true);
        expect(result.ok && (result.dto as unknown as { futureField: number }).futureField).toBe(42);
    });

    it("отвергает не-объект", () => {
        const result = validatePlanDTO("не план");

        expect(result.ok).toBe(false);
        expect(result.ok === false && result.reason).toMatch(/формату плана/);
    });

    it("сообщает путь до сломанного поля", () => {
        const dto = makeDto();
        // @ts-expect-error намеренно ломаем тип для проверки сообщения
        dto.tracks[0].yOffsetMeters = "пять";

        const result = validatePlanDTO(dto);

        expect(result.ok).toBe(false);
        expect(result.ok === false && result.reason).toContain("tracks.[0].yOffsetMeters");
    });

    it("отвергает неизвестное значение перечисления", () => {
        const dto = makeDto();
        // @ts-expect-error намеренно ломаем тип
        dto.catenaryPoles[0].material = "дерево";

        expect(validatePlanDTO(dto).ok).toBe(false);
    });

    it("ловит висячую ссылку на опору", () => {
        const dto = makeDto({ fixingPoints: [{ id: "fp1", poleId: "нет-такой", yOffset: 0 }] });

        const result = validatePlanDTO(dto);

        expect(result.ok).toBe(false);
        expect(result.ok === false && result.reason).toMatch(/несуществующую опору/);
    });

    it("ловит висячую ссылку АУ на точку фиксации", () => {
        const dto = makeDto({
            anchorSections: [{ id: "as1", type: CatenaryType.CS120, fixingPointIds: ["нет-такой"] }],
        });

        const result = validatePlanDTO(dto);

        expect(result.ok).toBe(false);
        expect(result.ok === false && result.reason).toMatch(/несуществующую точку фиксации/);
    });

    it("ловит главный путь опоры вне её привязок", () => {
        const dto = makeDto();
        dto.catenaryPoles[0].primaryTrackId = "t-другой";

        const result = validatePlanDTO(dto);

        expect(result.ok).toBe(false);
        expect(result.ok === false && result.reason).toMatch(/главный путь не среди её привязок/);
    });

    it("ловит висячую ссылку сопряжения на АУ", () => {
        const dto = makeDto({
            junctions: [{ id: "j1", type: "insulating", section1Id: "as1", section2Id: "нет-такой" }],
        });

        expect(validatePlanDTO(dto).ok).toBe(false);
    });
});
