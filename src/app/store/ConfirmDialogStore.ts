import { makeAutoObservable } from "mobx";

export interface ConfirmRequest {
    title: string;
    /** Основной вопрос. */
    message: string;
    /** Уточнения списком: что именно произойдёт (последствия каскада и т. п.). */
    details?: string[];
    confirmLabel?: string;
    cancelLabel?: string;
    /** Красная кнопка подтверждения — для необратимых и разрушительных действий. */
    danger?: boolean;
}

/**
 * Единое подтверждение действий вместо `window.confirm` и локальных модалок в панелях.
 * UI-стор: живёт вне undo-стека, рисуется виджетом `ConfirmDialog`.
 */
export class ConfirmDialogStore {
    request: ConfirmRequest | null = null;

    private _resolve: ((confirmed: boolean) => void) | null = null;

    constructor() {
        makeAutoObservable<ConfirmDialogStore, "_resolve">(this, { _resolve: false });
    }

    /** Спросить пользователя. Новый запрос отменяет предыдущий (`false` в его промис). */
    ask(request: ConfirmRequest): Promise<boolean> {
        this._settle(false);

        // Исполнитель промиса вызывается синхронно, т. е. всё ещё внутри этого action.
        return new Promise<boolean>((resolve) => {
            this.request = request;
            this._resolve = resolve;
        });
    }

    confirm(): void {
        this._settle(true);
    }

    cancel(): void {
        this._settle(false);
    }

    private _settle(confirmed: boolean): void {
        const resolve = this._resolve;
        this._resolve = null;
        this.request = null;
        resolve?.(confirmed);
    }
}
