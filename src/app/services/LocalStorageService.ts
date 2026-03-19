import type { PlanDTO, PlanMeta } from "@/shared/types/planTypes";

const PLANS_KEY = "ech3_plans";
const PLAN_DATA_PREFIX = "ech3_plan_";

export class LocalStorageService {
    saveList(plans: PlanMeta[]): void {
        try {
            localStorage.setItem(PLANS_KEY, JSON.stringify(plans));
        } catch {
            console.warn("LocalStorageService: не удалось сохранить список планов");
        }
    }

    loadList(): PlanMeta[] {
        try {
            const raw = localStorage.getItem(PLANS_KEY);
            return raw ? (JSON.parse(raw) as PlanMeta[]) : [];
        } catch {
            return [];
        }
    }

    savePlan(dto: PlanDTO): void {
        try {
            localStorage.setItem(PLAN_DATA_PREFIX + dto.id, JSON.stringify(dto));
        } catch {
            console.warn("LocalStorageService: не удалось сохранить план", dto.id);
        }
    }

    loadPlan(id: string): PlanDTO | null {
        try {
            const raw = localStorage.getItem(PLAN_DATA_PREFIX + id);
            return raw ? (JSON.parse(raw) as PlanDTO) : null;
        } catch {
            return null;
        }
    }

    deletePlan(id: string): void {
        localStorage.removeItem(PLAN_DATA_PREFIX + id);
    }
}
