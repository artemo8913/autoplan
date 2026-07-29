import { makeAutoObservable, observable } from "mobx";

import type { EntityType } from "@/shared/types/toolTypes";

export class SelectionStore {
    private _ids: Map<string, true> = new Map();
    selectedType: EntityType | "mixed" | null = null;

    constructor() {
        makeAutoObservable<SelectionStore, "_ids">(this, {
            _ids: observable,
            isSelected: false,
        });
    }

    /** Per-key проверка — ре-рендер только при изменении статуса ЭТОГО ключа */
    isSelected(id: string): boolean {
        return this._ids.has(id);
    }

    get hasSelection(): boolean {
        return this._ids.size > 0;
    }

    get firstSelectedId(): string | undefined {
        return this._ids.keys().next().value;
    }

    get selectedIds(): string[] {
        return [...this._ids.keys()];
    }

    select(id: string, type: EntityType): void {
        this._ids.clear();
        this._ids.set(id, true);
        this.selectedType = type;
    }

    toggle(id: string, type: EntityType): void {
        if (this._ids.has(id)) {
            this._ids.delete(id);
            if (this._ids.size === 0) {
                this.selectedType = null;
            }
        } else {
            this._ids.set(id, true);
            this.selectedType =
                this.selectedType === null || this.selectedType === type ? type : "mixed";
        }
    }

    setMulti(ids: string[], type: EntityType | "mixed" | null): void {
        this._ids.clear();
        ids.forEach((id) => this._ids.set(id, true));
        this.selectedType = ids.length === 0 ? null : type;
    }

    clear(): void {
        this._ids.clear();
        this.selectedType = null;
    }
}
