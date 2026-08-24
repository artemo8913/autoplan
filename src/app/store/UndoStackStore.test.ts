import { describe, it, expect } from "vitest";

import { UndoStackStore, BatchCommand, MERGE_WINDOW_MS } from "./UndoStackStore";

/** Команда, пишущая лог вызовов в общий массив для проверки порядка. */
function makeCmd(log: string[], tag: string) {
    return {
        description: tag,
        execute: () => log.push(`do:${tag}`),
        undo: () => log.push(`undo:${tag}`),
    };
}

describe("UndoStackStore", () => {
    it("execute выполняет команду, кладёт в undo и чистит redo", () => {
        const log: string[] = [];
        const store = new UndoStackStore();

        store.execute(makeCmd(log, "a"));

        expect(log).toEqual(["do:a"]);
        expect(store.canUndo).toBe(true);
        expect(store.canRedo).toBe(false);
        expect(store.lastDescription).toBe("a");
    });

    it("undo/redo обратимы и переносят команду между стеками", () => {
        const log: string[] = [];
        const store = new UndoStackStore();

        store.execute(makeCmd(log, "a"));
        store.undo();
        expect(store.canUndo).toBe(false);
        expect(store.canRedo).toBe(true);

        store.redo();
        expect(store.canUndo).toBe(true);
        expect(store.canRedo).toBe(false);
        expect(log).toEqual(["do:a", "undo:a", "do:a"]);
    });

    it("новый execute очищает redo-стек", () => {
        const log: string[] = [];
        const store = new UndoStackStore();

        store.execute(makeCmd(log, "a"));
        store.undo();
        expect(store.canRedo).toBe(true);

        store.execute(makeCmd(log, "b"));
        expect(store.canRedo).toBe(false);
    });

    it("undo/redo на пустых стеках — безопасный no-op", () => {
        const store = new UndoStackStore();
        expect(() => store.undo()).not.toThrow();
        expect(() => store.redo()).not.toThrow();
        expect(store.lastDescription).toBeNull();
    });

    it("undoStack не превышает maxSize (старейшая команда вытесняется)", () => {
        const log: string[] = [];
        const store = new UndoStackStore();

        for (let i = 0; i < store.maxSize + 5; i++) {
            store.execute(makeCmd(log, String(i)));
        }

        expect(store.undoStack).toHaveLength(store.maxSize);
        // Первые 5 вытеснены: самая старая — команда №5
        expect(store.undoStack[0].description).toBe("5");
        expect(store.lastDescription).toBe(String(store.maxSize + 4));
    });
});

describe("UndoStackStore — склейка команд по mergeKey", () => {
    /** Команда «поле = value» с логом, как у текстового ввода в панели. */
    function makeSetCmd(state: { value: string }, value: string) {
        const prev = state.value;
        return {
            description: `set:${value}`,
            execute: () => {
                state.value = value;
            },
            undo: () => {
                state.value = prev;
            },
        };
    }

    it("подряд идущие правки одного поля схлопываются, откат — к самому раннему значению", () => {
        const store = new UndoStackStore();
        const state = { value: "" };

        store.execute(makeSetCmd(state, "а"), "name:1");
        store.execute(makeSetCmd(state, "аб"), "name:1");
        store.execute(makeSetCmd(state, "абв"), "name:1");

        expect(state.value).toBe("абв");
        expect(store.undoStack).toHaveLength(1);
        expect(store.lastDescription).toBe("set:абв");

        store.undo();
        expect(state.value).toBe("");
    });

    it("склеенную команду можно повторить через redo", () => {
        const store = new UndoStackStore();
        const state = { value: "" };

        store.execute(makeSetCmd(state, "а"), "name:1");
        store.execute(makeSetCmd(state, "аб"), "name:1");
        store.undo();
        store.redo();

        expect(state.value).toBe("аб");
    });

    it("разные ключи и команды без ключа не склеиваются", () => {
        const store = new UndoStackStore();
        const state = { value: "" };

        store.execute(makeSetCmd(state, "а"), "name:1");
        store.execute(makeSetCmd(state, "б"), "name:2");
        store.execute(makeSetCmd(state, "в"));

        expect(store.undoStack).toHaveLength(3);
    });

    it("правка того же поля после паузы дольше окна склейки — отдельная команда", () => {
        let now = 1000;
        const store = new UndoStackStore(() => now);
        const state = { value: "" };

        store.execute(makeSetCmd(state, "а"), "name:1");
        now += MERGE_WINDOW_MS + 1;
        store.execute(makeSetCmd(state, "аб"), "name:1");

        expect(store.undoStack).toHaveLength(2);

        store.undo();
        expect(state.value).toBe("а");
    });

    it("после undo следующая правка того же поля не склеивается с прошлой", () => {
        const store = new UndoStackStore();
        const state = { value: "" };

        store.execute(makeSetCmd(state, "а"), "name:1");
        store.undo();
        store.execute(makeSetCmd(state, "б"), "name:1");

        expect(store.undoStack).toHaveLength(1);
        expect(state.value).toBe("б");
    });
});

describe("BatchCommand", () => {
    it("execute применяет под-команды по порядку, undo — в обратном", () => {
        const log: string[] = [];
        const batch = new BatchCommand("batch", [makeCmd(log, "1"), makeCmd(log, "2"), makeCmd(log, "3")]);

        batch.execute();
        batch.undo();

        expect(log).toEqual(["do:1", "do:2", "do:3", "undo:3", "undo:2", "undo:1"]);
    });

    it("работает как одна команда внутри UndoStackStore", () => {
        const log: string[] = [];
        const store = new UndoStackStore();

        store.execute(new BatchCommand("batch", [makeCmd(log, "1"), makeCmd(log, "2")]));
        store.undo();

        expect(log).toEqual(["do:1", "do:2", "undo:2", "undo:1"]);
        expect(store.lastDescription).toBeNull();
    });
});
