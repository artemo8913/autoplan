import { makeAutoObservable } from "mobx";

interface Command {
    description: string;
    execute(): void;
    undo(): void;
}

export class UndoStackStore {
    undoStack: Command[] = [];
    redoStack: Command[] = [];
    maxSize = 100;

    constructor() {
        makeAutoObservable(this);
    }

    execute(cmd: Command) {
        cmd.execute();

        this.undoStack.push(cmd);

        if (this.undoStack.length > this.maxSize) {
            this.undoStack.shift();
        }

        this.redoStack = [];
    }

    undo() {
        const cmd = this.undoStack.pop();
        
        if (!cmd){
            return;
        }

        
        cmd.undo();
        this.redoStack.push(cmd);
    }

    redo() {
        const cmd = this.redoStack.pop();
        
        if (!cmd){
            return;
        }

        
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
}

export class BatchCommand implements Command {
    constructor(
        public description: string,
        private commands: Command[],
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
