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

    constructor(now: () => number = Date.now) {
        this._now = now;
        makeAutoObservable(this);
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
    }

    undo() {
        const cmd = this.undoStack.pop();

        if (!cmd) {
            return;
        }

        this._resetMerge();
        cmd.undo();
        this.redoStack.push(cmd);
    }

    redo() {
        const cmd = this.redoStack.pop();

        if (!cmd) {
            return;
        }

        this._resetMerge();
        cmd.execute();
        this.undoStack.push(cmd);
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

    private _resetMerge(): void {
        this._lastMergeKey = null;
        this._lastMergeAt = 0;
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
