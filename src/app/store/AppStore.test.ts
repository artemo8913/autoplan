import { describe, it, expect } from "vitest";

import { AppStore } from "./AppStore";
import { PlansStore } from "./PlansStore";

function setup() {
    const plansStore = new PlansStore();
    plansStore.add({
        id: "p1",
        name: "Демо",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
    });
    return { plansStore, app: new AppStore(plansStore) };
}

describe("AppStore", () => {
    it("стартует на списке планов без текущего плана", () => {
        const { app } = setup();
        expect(app.currentView).toBe("planslist");
        expect(app.currentPlanId).toBeNull();
        expect(app.currentPlanName).toBe("");
    });

    it("setCurrentPlan переключает на canvas и резолвит имя из PlansStore", () => {
        const { app } = setup();
        app.setCurrentPlan("p1");

        expect(app.currentView).toBe("canvas");
        expect(app.currentPlanId).toBe("p1");
        expect(app.currentPlanName).toBe("Демо");
    });

    it("имя пустое, если план отсутствует в сторе", () => {
        const { app } = setup();
        app.setCurrentPlan("unknown");
        expect(app.currentPlanName).toBe("");
    });

    it("clearCurrentPlan возвращает к списку", () => {
        const { app } = setup();
        app.setCurrentPlan("p1");
        app.clearCurrentPlan();

        expect(app.currentView).toBe("planslist");
        expect(app.currentPlanId).toBeNull();
    });
});
