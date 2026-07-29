import { describe, it, expect, beforeEach } from "vitest";

import { DisplaySettingsStore, DISPLAY_DEFAULTS } from "./DisplaySettingsStore";

/** Минимальный in-memory localStorage для node-окружения. */
class LocalStorageStub {
    private store = new Map<string, string>();
    getItem(key: string): string | null {
        return this.store.has(key) ? this.store.get(key)! : null;
    }
    setItem(key: string, value: string): void {
        this.store.set(key, String(value));
    }
    removeItem(key: string): void {
        this.store.delete(key);
    }
    clear(): void {
        this.store.clear();
    }
}

const STORAGE_KEY = "ech3_display_settings";

beforeEach(() => {
    (globalThis as { localStorage: Storage }).localStorage = new LocalStorageStub() as unknown as Storage;
});

describe("DisplaySettingsStore", () => {
    it("без сохранённых данных использует дефолты", () => {
        const s = new DisplaySettingsStore();
        expect(s.catenaryPoleRadius).toBe(DISPLAY_DEFAULTS.catenaryPoleRadius);
        expect(s.poleLabelYOffset).toBe(DISPLAY_DEFAULTS.poleLabelYOffset);
    });

    it("set меняет поле, resetToDefaults откатывает", () => {
        const s = new DisplaySettingsStore();
        s.set("poleLabelYOffset", 999);
        expect(s.poleLabelYOffset).toBe(999);

        s.resetToDefaults();
        expect(s.poleLabelYOffset).toBe(DISPLAY_DEFAULTS.poleLabelYOffset);
    });

    it("saveToStorage → новый стор восстанавливает значения", () => {
        const s = new DisplaySettingsStore();
        s.set("poleLabelYOffset", 42);
        s.set("baseStroke", 7);
        s.saveToStorage();

        const restored = new DisplaySettingsStore();
        expect(restored.poleLabelYOffset).toBe(42);
        expect(restored.baseStroke).toBe(7);
    });

    it("битый JSON в хранилище → дефолты без исключения", () => {
        localStorage.setItem(STORAGE_KEY, "{не валидный json");
        const s = new DisplaySettingsStore();
        expect(s.catenaryPoleRadius).toBe(DISPLAY_DEFAULTS.catenaryPoleRadius);
    });

    it("значение неверного типа игнорируется (остаётся дефолт)", () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ baseStroke: "толстая" }));
        const s = new DisplaySettingsStore();
        expect(s.baseStroke).toBe(DISPLAY_DEFAULTS.baseStroke);
    });
});
