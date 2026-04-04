import type { PlanDTO, PlanMeta } from "@/shared/types/planTypes";

import type { PlanSerializationService } from "./PlanSerializationService";
import type { PlanEntityStores } from "../types";
import type { AppStore } from "../store/AppStore";
import type { PlansStore } from "../store/PlansStore";
import { createTestData } from "../initMock";

const PLANS_KEY = "ech3_plans";
const PLAN_DATA_PREFIX = "ech3_plan_";

export class PlanService {
    constructor(
        private readonly _appStore: AppStore,
        private readonly _plansStore: PlansStore,
        private readonly _serializationService: PlanSerializationService,
        private readonly _entityStores: PlanEntityStores,
    ) {}

    savePlanListToStorage(plans: PlanMeta[]): void {
        try {
            localStorage.setItem(PLANS_KEY, JSON.stringify(plans));
        } catch {
            console.warn("LocalStorageService: не удалось сохранить список планов");
        }
    }

    loadPlanListFromStorage(): PlanMeta[] {
        try {
            const raw = localStorage.getItem(PLANS_KEY);
            return raw ? (JSON.parse(raw) as PlanMeta[]) : [];
        } catch {
            return [];
        }
    }

    savePlanToStorage(dto: PlanDTO): void {
        try {
            localStorage.setItem(PLAN_DATA_PREFIX + dto.id, JSON.stringify(dto));
        } catch {
            console.warn("LocalStorageService: не удалось сохранить план", dto.id);
        }
    }

    loadPlanFromStorage(id: string): PlanDTO | null {
        try {
            const raw = localStorage.getItem(PLAN_DATA_PREFIX + id);
            return raw ? (JSON.parse(raw) as PlanDTO) : null;
        } catch {
            return null;
        }
    }

    deletePlanFromStorage(id: string): void {
        localStorage.removeItem(PLAN_DATA_PREFIX + id);
    }

    openPlan(id: string): void {
        const dto = this.loadPlanFromStorage(id);

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
        this.savePlanToStorage(dto);
        this.savePlanListToStorage(this._plansStore.list);
        this._serializationService.fromDTO(dto, this._entityStores);
        this._appStore.setCurrentPlan(meta.id);
    }

    importPlan(dto: PlanDTO): void {
        const now = new Date().toISOString();
        const meta: PlanMeta = { id: crypto.randomUUID(), name: dto.name, createdAt: now, updatedAt: now };
        const importedDto: PlanDTO = { ...dto, ...meta };
        this._plansStore.add(meta);
        this.savePlanToStorage(importedDto);
        this.savePlanListToStorage(this._plansStore.list);
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
        this.savePlanToStorage(dto);
        this.savePlanListToStorage(this._plansStore.list);
        this._appStore.setCurrentPlan(meta.id);
    }

    deletePlan(id: string): void {
        this._plansStore.remove(id);
        this.deletePlanFromStorage(id);
        this.savePlanListToStorage(this._plansStore.list);

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
        this.savePlanToStorage(dto);
        this._plansStore.setJustUpdated(id);
        this.savePlanListToStorage(this._plansStore.list);
    }
}
