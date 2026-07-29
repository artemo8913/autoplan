import { describe, it, expect } from "vitest";

import { Railway } from "@/entities/catenaryPlanGraphic";
import { CatenaryType, RelativeSidePosition } from "@/shared/types/catenaryTypes";
import { CATENARY_POLE_RADIUS } from "@/shared/constants";
import type { PlanDTO } from "@/shared/types/planTypes";

import { PlanSerializationService } from "./PlanSerializationService";
import type { PlanEntityStores } from "../types";
import { CatenaryPoleStore } from "../store/CatenaryPoleStore";
import { TracksStore } from "../store/TracksStore";
import { FixingPointsStore } from "../store/FixingPointsStore";
import { AnchorSectionsStore } from "../store/AnchorSectionsStore";
import { JunctionsStore } from "../store/JunctionsStore";
import { VlPolesStore } from "../store/VlPolesStore";
import { WireLinesStore } from "../store/WireLinesStore";
import { CrossSpansStore } from "../store/CrossSpansStore";
import { DisconnectorsStore } from "../store/DisconnectorsStore";

function emptyStores(): PlanEntityStores {
    return {
        catenaryPoleStore: new CatenaryPoleStore([]),
        tracksStore: new TracksStore([], new Railway({ name: "tmp", startX: 0, endX: 1 })),
        fixingPointsStore: new FixingPointsStore([]),
        anchorSectionsStore: new AnchorSectionsStore([]),
        junctionsStore: new JunctionsStore([]),
        vlPolesStore: new VlPolesStore([]),
        wireLinesStore: new WireLinesStore([]),
        crossSpansStore: new CrossSpansStore([]),
        disconnectorsStore: new DisconnectorsStore([]),
    };
}

const dto: PlanDTO = {
    id: "plan-1",
    name: "Plan",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    railway: { name: "R", startX: 0, endX: 10000 },
    tracks: [{ id: "t1", name: "1", startX: 0, endX: 10000, yOffsetMeters: 0 }],
    catenaryPoles: [
        {
            id: "cp1",
            x: 100,
            name: "1",
            radius: CATENARY_POLE_RADIUS,
            material: "concrete",
            isInsulatingJunctionAnchor: true,
            grounding: "И",
            anchorGuy: { type: "single", direction: RelativeSidePosition.RIGHT },
            trackBindings: [{ trackId: "t1", gabarit: 5, relativePositionToTrack: RelativeSidePosition.RIGHT }],
        },
        {
            id: "cp2",
            x: 1600,
            name: "2",
            radius: CATENARY_POLE_RADIUS,
            material: "metal",
            isInsulatingJunctionAnchor: false,
            anchorBrace: { direction: RelativeSidePosition.LEFT },
            trackBindings: [{ trackId: "t1", gabarit: 5, relativePositionToTrack: RelativeSidePosition.RIGHT }],
        },
    ],
    vlPoles: [{ id: "vl1", x: 300, y: 50, name: "В1", vlType: "intermediate" }],
    fixingPoints: [
        { id: "fp1", poleId: "cp1", trackId: "t1", yOffset: 0, zigzagValue: 300 },
        { id: "fp2", poleId: "cp1", yOffset: 0, supportType: "crossSpan", crossSpanId: "cs1" },
    ],
    anchorSections: [
        {
            id: "as1",
            name: "АУ1",
            type: CatenaryType.CS140,
            startPoleId: "cp1",
            endPoleId: "cp2",
            fixingPointIds: ["fp1", "fp2"],
            primaryTrackId: "t1",
        },
        { id: "as2", type: CatenaryType.CS120, startPoleId: "cp2", endPoleId: "cp1", fixingPointIds: [], primaryTrackId: "t1" },
    ],
    junctions: [{ id: "j1", type: "non-insulating", section1Id: "as1", section2Id: "as2" }],
    wireLines: [{ id: "wl1", wireType: "feeding_25", label: "Ф1", fixingPointIds: ["fp1"] }],
    crossSpans: [{ id: "cs1", type: "rigid", poleAId: "cp1", poleBId: "cp2" }],
    disconnectors: [
        { id: "d1", name: "Р1", poleId: "cp1", controlType: "manual", state: "off", phaseCount: 1, yOffset: 20 },
    ],
};

describe("PlanSerializationService round-trip", () => {
    it("fromDTO → toDTO воспроизводит исходный DTO", () => {
        const service = new PlanSerializationService();
        const stores = emptyStores();

        service.fromDTO(dto, stores);
        const result = service.toDTO(
            { id: dto.id, name: dto.name, createdAt: dto.createdAt, updatedAt: dto.updatedAt },
            stores,
        );

        expect(result).toEqual(dto);
    });

    it("fromDTO наполняет сторы (поперечины строятся до ТФ под ригелем)", () => {
        const service = new PlanSerializationService();
        const stores = emptyStores();

        service.fromDTO(dto, stores);

        expect(stores.catenaryPoleStore.list).toHaveLength(2);
        expect(stores.crossSpansStore.list).toHaveLength(1);
        // ТФ под ригелем разрешила ссылку на поперечину
        const fp2 = stores.fixingPointsStore.fixingPoints.get("fp2")!;
        expect(fp2.crossSpan?.id).toBe("cs1");
        expect(fp2.supportType).toBe("crossSpan");
    });
});

describe("PlanSerializationService: пикетаж", () => {
    const meta = { id: dto.id, name: dto.name, createdAt: dto.createdAt, updatedAt: dto.updatedAt };

    it("round-trip сохраняет пикетаж", () => {
        const service = new PlanSerializationService();
        const stores = emptyStores();
        const dtoP: PlanDTO = {
            ...dto,
            railway: {
                name: "R",
                startX: 0,
                endX: 10000,
                picketage: [{ km: 5, picketCount: 11, picketOverrides: { 10: 43 } }],
            },
        };

        service.fromDTO(dtoP, stores);
        expect(stores.tracksStore.railway.picketage.length).toBe(1);

        const result = service.toDTO(meta, stores);
        expect(result.railway.picketage).toEqual([{ km: 5, picketCount: 11, picketOverrides: { 10: 43 } }]);
    });

    it("старый DTO без picketage → пустой пикетаж, toDTO не пишет поле", () => {
        const service = new PlanSerializationService();
        const stores = emptyStores();

        service.fromDTO(dto, stores);
        expect(stores.tracksStore.railway.picketage.length).toBe(0);

        const result = service.toDTO(meta, stores);
        expect(result.railway.picketage).toBeUndefined();
    });
});
