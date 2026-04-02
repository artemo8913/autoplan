import type { PlanDTO, PlanMeta } from "@/shared/types/planTypes";

import type { LocalStorageService } from "./LocalStorageService";
import type { PlanSerializationService } from "./PlanSerializationService";
import type { PlanEntityStores } from "../types";
import type { AppStore } from "../store/AppStore";
import type { PlansStore } from "../store/PlansStore";
import { createTestData } from "../initMock";

export class PlanService {
    constructor(
        private readonly _appStore: AppStore,
        private readonly _plansStore: PlansStore,
        private readonly _serializationService: PlanSerializationService,
        private readonly _localStorageService: LocalStorageService,
        private readonly _entityStores: PlanEntityStores,
    ) {}

    openPlan(id: string): void {
        const dto = this._localStorageService.loadPlan(id);

        if (!dto) {
            return;
        }

        this._serializationService.fromDTO(dto, this._entityStores);
        this._appStore.setCurrentPlan(id);
    }

    closePlan(): void {
        this.saveCurrent();
        this._appStore.clearCurrentPlan();
    }

    createPlan(name: string): void {
        const now = new Date().toISOString();
        const meta: PlanMeta = { id: crypto.randomUUID(), name, createdAt: now, updatedAt: now };
        const dto: PlanDTO = { ...this._serializationService.createEmptyDTO(name), ...meta };
        this._plansStore.add(meta);
        this._localStorageService.savePlan(dto);
        this._localStorageService.saveList(this._plansStore.list);
        this._serializationService.fromDTO(dto, this._entityStores);
        this._appStore.setCurrentPlan(meta.id);
    }

    importPlan(dto: PlanDTO): void {
        const now = new Date().toISOString();
        const meta: PlanMeta = { id: crypto.randomUUID(), name: dto.name, createdAt: now, updatedAt: now };
        const importedDto: PlanDTO = { ...dto, ...meta };
        this._plansStore.add(meta);
        this._localStorageService.savePlan(importedDto);
        this._localStorageService.saveList(this._plansStore.list);
        this._serializationService.fromDTO(importedDto, this._entityStores);
        this._appStore.setCurrentPlan(meta.id);
    }

    loadDemoPlan(): void {
        const data = createTestData();
        const now = new Date().toISOString();
        const meta: PlanMeta = {
            id: crypto.randomUUID(),
            name: "Демо: Малиногорка — Козулька",
            createdAt: now,
            updatedAt: now,
        };

        this._entityStores.tracksStore.loadFrom(data.tracks, data.railway);
        this._entityStores.polesStore.loadFrom(data.poles);
        this._entityStores.vlPolesStore.loadFrom(data.vlPoles);
        this._entityStores.fixingPointsStore.loadFrom(data.fixingPoints);
        this._entityStores.anchorSectionsStore.loadFrom(data.anchorSections);
        this._entityStores.junctionsStore.loadFrom(data.junctions);
        this._entityStores.wireLinesStore.loadFrom(data.wireLines);
        this._entityStores.crossSpansStore.loadFrom(data.crossSpans);
        this._entityStores.disconnectorsStore.loadFrom([]);

        this._plansStore.add(meta);
        const dto = this._serializationService.toDTO(meta, this._entityStores);
        this._localStorageService.savePlan(dto);
        this._localStorageService.saveList(this._plansStore.list);
        this._appStore.setCurrentPlan(meta.id);
    }

    deletePlan(id: string): void {
        this._plansStore.remove(id);
        this._localStorageService.deletePlan(id);
        this._localStorageService.saveList(this._plansStore.list);

        if (this._appStore.currentPlanId === id) {
            this._appStore.clearCurrentPlan();
        }
    }

    saveCurrent(): void {
        const id = this._appStore.currentPlanId;

        if (!id) {
            return;
        }

        const meta = this._plansStore.get(id);

        if (!meta) {
            return;
        }

        const updatedMeta: PlanMeta = { ...meta, updatedAt: new Date().toISOString() };
        const dto = this._serializationService.toDTO(updatedMeta, this._entityStores);
        this._localStorageService.savePlan(dto);
        this._plansStore.setJustUpdated(id);
        this._localStorageService.saveList(this._plansStore.list);
    }
}
