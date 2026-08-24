import { makeAutoObservable } from "mobx";

/**
 * Состояние автосохранения текущего плана:
 *   idle    — сохранять нечего (план не открыт или изменений не было);
 *   pending — есть несохранённые правки, сохранение отложено (debounce);
 *   saved   — всё записано в localStorage;
 *   error   — последняя запись не удалась (обычно переполнено хранилище).
 */
export type SaveStatus = "idle" | "pending" | "saved" | "error";

export class SaveStatusStore {
    status: SaveStatus = "idle";
    lastSavedAt: Date | null = null;
    errorMessage: string | null = null;

    constructor() {
        makeAutoObservable(this);
    }

    setIdle(): void {
        this.status = "idle";
        this.lastSavedAt = null;
        this.errorMessage = null;
    }

    setPending(): void {
        this.status = "pending";
    }

    setSaved(at: Date = new Date()): void {
        this.status = "saved";
        this.lastSavedAt = at;
        this.errorMessage = null;
    }

    setError(message: string): void {
        this.status = "error";
        this.errorMessage = message;
    }
}
