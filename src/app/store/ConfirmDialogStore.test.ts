import { describe, it, expect } from "vitest";

import { ConfirmDialogStore } from "./ConfirmDialogStore";

const request = { title: "Удалить?", message: "Точно?" };

describe("ConfirmDialogStore", () => {
    it("ask показывает запрос, confirm возвращает true и закрывает окно", async () => {
        const store = new ConfirmDialogStore();

        const answer = store.ask(request);
        expect(store.request).toEqual(request);

        store.confirm();

        await expect(answer).resolves.toBe(true);
        expect(store.request).toBeNull();
    });

    it("cancel возвращает false", async () => {
        const store = new ConfirmDialogStore();

        const answer = store.ask(request);
        store.cancel();

        await expect(answer).resolves.toBe(false);
    });

    it("новый запрос отменяет предыдущий", async () => {
        const store = new ConfirmDialogStore();

        const first = store.ask(request);
        const second = store.ask({ title: "Другое", message: "?" });

        await expect(first).resolves.toBe(false);
        expect(store.request?.title).toBe("Другое");

        store.confirm();
        await expect(second).resolves.toBe(true);
    });
});
