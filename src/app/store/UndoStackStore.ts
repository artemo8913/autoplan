import { makeAutoObservable } from "mobx";

/** Обратимая операция без описания — кирпичик, из которого собираются команды. */
export interface ReversibleOp {
    execute(): void;
    undo(): void;
}

export interface Command extends ReversibleOp {
    description: string;
}

/**
 * Окно склейки команд с одинаковым mergeKey (мс).
 * Текстовый/числовой ввод в панелях сыплет командой на каждый keypress —
 * подряд идущие правки одного поля схлопываются в одну запись undo-стека.
 */
export const MERGE_WINDOW_MS = 800;

export class UndoStackStore {
    undoStack: Command[] = [];
    redoStack: Command[] = [];
    maxSize = 100;

    private _lastMergeKey: string | null = null;
    private _lastMergeAt = 0;
    private readonly _now: () => number;
    /** Подписчики на любое изменение содержимого плана (execute / undo / redo). */
    private readonly _listeners = new Set<() => void>();

    constructor(now: () => number = Date.now) {
        this._now = now;
        makeAutoObservable<UndoStackStore, "_listeners">(this, { _listeners: false });
    }

    /**
     * Подписка на изменение плана: вызывается после каждой команды, undo и redo.
     * Единая точка, из которой автосохранение узнаёт, что план стал другим.
     * Возвращает функцию отписки.
     */
    onChange(listener: () => void): () => void {
        this._listeners.add(listener);
        return () => this._listeners.delete(listener);
    }

    /**
     * Выполнить команду и положить её в undo-стек.
     * `mergeKey` — необязательный ключ склейки: если предыдущая команда пришла
     * с тем же ключом не далее MERGE_WINDOW_MS назад, новая заменяет её,
     * сохраняя откат к самому раннему значению.
     */
    execute(cmd: Command, mergeKey?: string) {
        cmd.execute();

        const now = this._now();
        const top = this.undoStack[this.undoStack.length - 1];
        const canMerge =
            mergeKey !== undefined &&
            top !== undefined &&
            this._lastMergeKey === mergeKey &&
            now - this._lastMergeAt <= MERGE_WINDOW_MS;

        if (canMerge) {
            this.undoStack[this.undoStack.length - 1] = {
                description: cmd.description,
                execute: () => cmd.execute(),
                undo: () => top.undo(),
            };
        } else {
            this.undoStack.push(cmd);

            if (this.undoStack.length > this.maxSize) {
                this.undoStack.shift();
            }
        }

        this._lastMergeKey = mergeKey ?? null;
        this._lastMergeAt = now;
        this.redoStack = [];
        this._notify();
    }

    undo() {
        const cmd = this.undoStack.pop();

        if (!cmd) {
            return;
        }

        this._resetMerge();
        cmd.undo();
        this.redoStack.push(cmd);
        this._notify();
    }

    redo() {
        const cmd = this.redoStack.pop();

        if (!cmd) {
            return;
        }

        this._resetMerge();
        cmd.execute();
        this.undoStack.push(cmd);
        this._notify();
    }

    get canUndo(): boolean {
        return this.undoStack.length > 0;
    }

    get canRedo(): boolean {
        return this.redoStack.length > 0;
    }

    get lastDescription(): string | null {
        const last = this.undoStack[this.undoStack.length - 1];
        return last?.description ?? null;
    }

    /**
     * Очистить историю: вызывается при смене плана — команды предыдущего плана
     * ссылаются на его объекты, откатывать их поверх другого плана нельзя.
     * Изменением плана не считается: подписчиков не дёргает.
     */
    clear(): void {
        this.undoStack = [];
        this.redoStack = [];
        this._resetMerge();
    }

    private _resetMerge(): void {
        this._lastMergeKey = null;
        this._lastMergeAt = 0;
    }

    private _notify(): void {
        this._listeners.forEach((listener) => listener());
    }
}

export class BatchCommand implements Command {
    constructor(
        public description: string,
        private commands: ReversibleOp[],
    ) {}

    execute() {
        this.commands.forEach((cmd) => cmd.execute());
    }

    undo() {
        for (let i = this.commands.length - 1; i >= 0; i--) {
            this.commands[i].undo();
        }
    }
}
