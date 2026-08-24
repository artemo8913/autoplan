import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { Track } from "@/entities/catenaryPlanGraphic";

import { PlanService, AUTOSAVE_DEBOUNCE_MS } from "./PlanService";
import { PlanSerializationService } from "./PlanSerializationService";
import { MemoryNotificationService } from "./NotificationService";
import { makePlanEntityStores } from "./planStores.test-helper";
import { AppStore } from "../store/AppStore";
import { PlansStore } from "../store/PlansStore";
import { CameraStore } from "../store/CameraStore";
import { SaveStatusStore } from "../store/SaveStatusStore";
import { UndoStackStore } from "../store/UndoStackStore";

/** Минимальный localStorage: тесты идут в node-окружении, браузерного нет. */
class MemoryStorage implements Storage {
    private _data = new Map<string, string>();
    /** Ключи, запись в которые падает — имитация переполненного хранилища. */
    failingKeys = new Set<string>();
    writes = 0;

    get length(): number {
        return this._data.size;
    }
    key(index: number): string | null {
        return [...this._data.keys()][index] ?? null;
    }
    getItem(key: string): string | null {
        return this._data.get(key) ?? null;
    }
    setItem(key: string, value: string): void {
        if (this.failingKeys.has(key)) {
            throw new DOMException("QuotaExceededError");
        }
        this.writes++;
        this._data.set(key, value);
    }
    removeItem(key: string): void {
        this._data.delete(key);
    }
    clear(): void {
        this._data.clear();
    }
}

function setup() {
    const stores = makePlanEntityStores();
    const plansStore = new PlansStore();
    const appStore = new AppStore(plansStore);
    const cameraStore = new CameraStore();
    const undoStackStore = new UndoStackStore();
    const saveStatusStore = new SaveStatusStore();
    const notificationService = new MemoryNotificationService();
    const serialization = new PlanSerializationService();

    const service = new PlanService(
        appStore,
        plansStore,
        serialization,
        cameraStore,
        stores,
        undoStackStore,
        saveStatusStore,
        notificationService,
    );

    return { service, stores, plansStore, appStore, undoStackStore, saveStatusStore, notificationService };
}

/** Правка плана обычным путём — командой undo-стека. */
function addTrack(stores: ReturnType<typeof setup>["stores"], undoStackStore: UndoStackStore, name: string) {
    const track = new Track({
        railway: stores.tracksStore.railway,
        name,
        startX: 0,
        endX: 1000,
        yOffsetMeters: 5,
    });
    undoStackStore.execute({
        description: `Добавлен путь ${name}`,
        execute: () => stores.tracksStore.add(track),
        undo: () => stores.tracksStore.remove(track.id),
    });
}

let storage: MemoryStorage;

beforeEach(() => {
    storage = new MemoryStorage();
    vi.stubGlobal("localStorage", storage);
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

describe("PlanService — автосохранение", () => {
    it("правка плана переводит состояние в «сохраняется», а по таймеру — в «сохранено»", () => {
        const { service, stores, undoStackStore, saveStatusStore } = setup();
        service.createPlan("План");
        service.startAutosave();

        addTrack(stores, undoStackStore, "1");
        expect(saveStatusStore.status).toBe("pending");

        vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS);

        expect(saveStatusStore.status).toBe("saved");
        expect(saveStatusStore.lastSavedAt).toBeInstanceOf(Date);
    });

    it("сохранённый план содержит последние правки", () => {
        const { service, stores, appStore, undoStackStore } = setup();
        service.createPlan("План");
        service.startAutosave();

        addTrack(stores, undoStackStore, "II");
        vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS);

        const saved = service.loadPlanFromStorage(appStore.currentPlanId!);
        expect(saved?.tracks.map((t) => t.name)).toEqual(["II"]);
    });

    it("серия правок пишется один раз (debounce)", () => {
        const { service, stores, undoStackStore } = setup();
        service.createPlan("План");
        service.startAutosave();
        const writesBefore = storage.writes;

        addTrack(stores, undoStackStore, "1");
        vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS / 2);
        addTrack(stores, undoStackStore, "2");
        vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS / 2);
        addTrack(stores, undoStackStore, "3");
        vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS);

        // Одна запись плана + одна записи списка планов.
        expect(storage.writes - writesBefore).toBe(2);
    });

    it("undo тоже сохраняется", () => {
        const { service, stores, appStore, undoStackStore } = setup();
        service.createPlan("План");
        service.startAutosave();

        addTrack(stores, undoStackStore, "1");
        vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS);
        undoStackStore.undo();
        vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS);

        expect(service.loadPlanFromStorage(appStore.currentPlanId!)?.tracks).toEqual([]);
    });

    it("flushAutosave пишет отложенное немедленно", () => {
        const { service, stores, appStore, undoStackStore, saveStatusStore } = setup();
        service.createPlan("План");
        service.startAutosave();

        addTrack(stores, undoStackStore, "1");
        service.flushAutosave();

        expect(saveStatusStore.status).toBe("saved");
        expect(service.loadPlanFromStorage(appStore.currentPlanId!)?.tracks).toHaveLength(1);
    });

    it("stopAutosave отменяет и подписку, и отложенную запись", () => {
        const { service, stores, undoStackStore, saveStatusStore } = setup();
        service.createPlan("План");
        service.startAutosave();

        addTrack(stores, undoStackStore, "1");
        service.stopAutosave();
        vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS);

        expect(saveStatusStore.status).toBe("pending");

        addTrack(stores, undoStackStore, "2");
        vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS);
        expect(saveStatusStore.status).toBe("pending");
    });

    it("переполненное хранилище: состояние «ошибка» и тост", () => {
        const { service, stores, appStore, undoStackStore, saveStatusStore, notificationService } = setup();
        service.createPlan("План");
        service.startAutosave();
        storage.failingKeys.add(`ech3_plan_${appStore.currentPlanId!}`);

        addTrack(stores, undoStackStore, "1");
        vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS);

        expect(saveStatusStore.status).toBe("error");
        expect(notificationService.last?.level).toBe("error");
    });
});

describe("PlanService — открытие и закрытие плана", () => {
    it("открытие плана очищает историю правок предыдущего", () => {
        const { service, stores, appStore, undoStackStore } = setup();
        service.createPlan("Первый");
        const firstId = appStore.currentPlanId!;
        addTrack(stores, undoStackStore, "1");
        expect(undoStackStore.canUndo).toBe(true);

        service.createPlan("Второй");
        expect(undoStackStore.canUndo).toBe(false);

        service.openPlan(firstId);
        expect(undoStackStore.canUndo).toBe(false);
    });

    it("выход к списку планов сохраняет отложенные правки", () => {
        const { service, stores, plansStore, appStore, undoStackStore, saveStatusStore } = setup();
        service.createPlan("План");
        service.startAutosave();
        const id = appStore.currentPlanId!;

        addTrack(stores, undoStackStore, "1");
        service.saveAndClosePlan();

        expect(appStore.currentView).toBe("planslist");
        expect(saveStatusStore.status).toBe("idle");
        expect(plansStore.get(id)).toBeDefined();
        expect(service.loadPlanFromStorage(id)?.tracks).toHaveLength(1);
    });

    it("битый план в хранилище не открывается и объясняет причину", () => {
        const { service, appStore, notificationService } = setup();
        storage.setItem("ech3_plan_broken", JSON.stringify({ version: 1, name: "Битый" }));

        service.openPlan("broken");

        expect(appStore.currentPlanId).toBeNull();
        expect(notificationService.last?.level).toBe("error");
    });

    it("импорт чужого файла отклоняется с внятной причиной", () => {
        const { service, notificationService } = setup();

        const result = service.importPlan({ hello: "world" });

        expect(result.ok).toBe(false);
        expect(notificationService.last?.message).toMatch(/Импорт не выполнен/);
    });

    it("демо-план сохраняется и открывается обратно", () => {
        const { service, appStore, stores } = setup();

        service.loadDemoPlan();
        const id = appStore.currentPlanId!;
        const poleCount = stores.catenaryPoleStore.list.length;

        service.saveAndClosePlan();
        service.openPlan(id);

        expect(appStore.currentPlanId).toBe(id);
        expect(stores.catenaryPoleStore.list).toHaveLength(poleCount);
    });
});

describe("PlanService — аварийная копия", () => {
    it("снимает дамп открытого плана и восстанавливает его отдельным планом", () => {
        const { service, stores, plansStore, undoStackStore } = setup();
        service.createPlan("Рабочий план");
        addTrack(stores, undoStackStore, "1");

        expect(service.saveCrashDump("TypeError: сломалось")).toBe(true);

        const dump = service.readCrashDump();
        expect(dump?.planName).toBe("Рабочий план");
        expect(dump?.dto.tracks).toHaveLength(1);

        expect(service.restoreCrashDump()).toBe(true);
        expect(plansStore.list.map((p) => p.name)).toContain("Рабочий план (восстановлено)");
        // Копия одноразовая: восстановили — забыли.
        expect(service.readCrashDump()).toBeNull();
    });

    it("без открытого плана снимать нечего", () => {
        const { service } = setup();

        expect(service.saveCrashDump("ошибка")).toBe(false);
        expect(service.readCrashDump()).toBeNull();
    });

    it("копию можно выбросить, не восстанавливая", () => {
        const { service } = setup();
        service.createPlan("План");
        service.saveCrashDump("ошибка");

        service.discardCrashDump();

        expect(service.readCrashDump()).toBeNull();
    });
});
