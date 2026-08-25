import { makeAutoObservable } from "mobx";

import type { Pos } from "@/shared/types/catenaryTypes";

/**
 * Позиция открытого контекстного меню (клиентские координаты курсора).
 *
 * Состав меню здесь не хранится — он каждый раз выводится из текущего выделения
 * (`buildContextMenuItems`), поэтому меню не может «протухнуть» относительно плана.
 * UI-стор: живёт вне undo-стека.
 */
export class ContextMenuStore {
    screenPos: Pos | null = null;

    constructor() {
        makeAutoObservable(this);
    }

    get isOpen(): boolean {
        return this.screenPos !== null;
    }

    open(screenPos: Pos): void {
        this.screenPos = { ...screenPos };
    }

    close(): void {
        this.screenPos = null;
    }
}
