import { describe, it, expect } from "vitest";

import type { FixingPoint } from "../model/FixingPoint";
import { moveFixingPoint, insertFixingPointAfter, removeFixingPoint } from "./fixingPointListOps";

// Операции читают только fp.id — достаточно заглушки.
const fp = (id: string) => ({ id }) as unknown as FixingPoint;
const ids = (arr: FixingPoint[]) => arr.map((f) => f.id);

describe("moveFixingPoint", () => {
    it("двигает вверх", () => {
        const list = [fp("a"), fp("b"), fp("c")];
        expect(ids(moveFixingPoint(list, "b", "up"))).toEqual(["b", "a", "c"]);
    });

    it("двигает вниз", () => {
        const list = [fp("a"), fp("b"), fp("c")];
        expect(ids(moveFixingPoint(list, "b", "down"))).toEqual(["a", "c", "b"]);
    });

    it("не двигает за границы и возвращает тот же массив", () => {
        const list = [fp("a"), fp("b")];
        expect(moveFixingPoint(list, "a", "up")).toBe(list);
        expect(moveFixingPoint(list, "b", "down")).toBe(list);
    });

    it("неизвестный id — без изменений", () => {
        const list = [fp("a"), fp("b")];
        expect(moveFixingPoint(list, "x", "up")).toBe(list);
    });

    it("не мутирует входной массив при успехе", () => {
        const list = [fp("a"), fp("b")];
        const result = moveFixingPoint(list, "b", "up");
        expect(result).not.toBe(list);
        expect(ids(list)).toEqual(["a", "b"]);
    });
});

describe("insertFixingPointAfter", () => {
    it("вставляет после указанного", () => {
        const list = [fp("a"), fp("b")];
        expect(ids(insertFixingPointAfter(list, "a", fp("x")))).toEqual(["a", "x", "b"]);
    });

    it("вставляет после последнего (в конец)", () => {
        const list = [fp("a"), fp("b")];
        expect(ids(insertFixingPointAfter(list, "b", fp("x")))).toEqual(["a", "b", "x"]);
    });

    it("при неизвестном afterId вставляет в начало (idx -1 → splice 0)", () => {
        const list = [fp("a"), fp("b")];
        expect(ids(insertFixingPointAfter(list, "?", fp("x")))).toEqual(["x", "a", "b"]);
    });

    it("не мутирует входной массив", () => {
        const list = [fp("a")];
        insertFixingPointAfter(list, "a", fp("x"));
        expect(ids(list)).toEqual(["a"]);
    });
});

describe("removeFixingPoint", () => {
    it("удаляет по id", () => {
        const list = [fp("a"), fp("b"), fp("c")];
        expect(ids(removeFixingPoint(list, "b"))).toEqual(["a", "c"]);
    });

    it("неизвестный id — содержимое не меняется", () => {
        const list = [fp("a"), fp("b")];
        expect(ids(removeFixingPoint(list, "x"))).toEqual(["a", "b"]);
    });

    it("не мутирует входной массив", () => {
        const list = [fp("a"), fp("b")];
        removeFixingPoint(list, "a");
        expect(ids(list)).toEqual(["a", "b"]);
    });
});
