import { describe, it, expect } from "vitest";

import type { Picketage } from "@/shared/types/catenaryTypes";

import { kmPkMToMeters, metersToKmPkM, formatKmPkM, formatOrdinateCompact } from "./measure";

describe("kmPkMToMeters", () => {
    it("складывает км/пк/м в абсолютные метры", () => {
        expect(kmPkMToMeters(4001, 9, 1)).toBe(4001901);
        expect(kmPkMToMeters(0, 0, 0)).toBe(0);
        expect(kmPkMToMeters(1, 0, 0)).toBe(1000);
        expect(kmPkMToMeters(0, 1, 0)).toBe(100);
    });
});

describe("metersToKmPkM", () => {
    it("раскладывает метры на км/пк/м", () => {
        expect(metersToKmPkM(4001901)).toEqual({ km: 4001, pk: 9, m: 1 });
        expect(metersToKmPkM(0)).toEqual({ km: 0, pk: 0, m: 0 });
        expect(metersToKmPkM(1234)).toEqual({ km: 1, pk: 2, m: 34 });
    });

    it("отрицательные значения зажимает в 0", () => {
        expect(metersToKmPkM(-500)).toEqual({ km: 0, pk: 0, m: 0 });
    });

    it("округляет дробные метры", () => {
        expect(metersToKmPkM(1234.4)).toEqual({ km: 1, pk: 2, m: 34 });
        expect(metersToKmPkM(1234.6)).toEqual({ km: 1, pk: 2, m: 35 });
    });
});

describe("round-trip км/пк/м ↔ метры", () => {
    it.each([0, 1, 100, 1000, 4001901, 999999])("сохраняет значение %i", (meters) => {
        const { km, pk, m } = metersToKmPkM(meters);
        expect(kmPkMToMeters(km, pk, m)).toBe(meters);
    });
});

describe("formatOrdinateCompact", () => {
    it("форматирует компактную координату", () => {
        expect(formatOrdinateCompact(4001901)).toBe("4001км9пк+1");
        expect(formatOrdinateCompact(0)).toBe("0км0пк+0");
    });
});

describe("пикетаж: рубленые км/пк", () => {
    it("пустой пикетаж = линейная формула", () => {
        expect(metersToKmPkM(1234, [])).toEqual({ km: 1, pk: 2, m: 34 });
        expect(kmPkMToMeters(1, 2, 34, [])).toBe(1234);
    });

    it("длинный км: 11 пикетов, ПК10 = 43 м", () => {
        const p: Picketage = [{ km: 5, picketCount: 11, picketOverrides: { 10: 43 } }];
        // ПК10 представим (линейная формула схлопнула бы его с км6)
        expect(kmPkMToMeters(5, 10, 20, p)).toBe(6020);
        expect(metersToKmPkM(6020, p)).toEqual({ km: 5, pk: 10, m: 20 });
        // км6 физически начинается на 6043 из-за рубленого км5
        expect(kmPkMToMeters(6, 0, 0, p)).toBe(6043);
        expect(metersToKmPkM(6043, p)).toEqual({ km: 6, pk: 0, m: 0 });
    });

    it("короткий км: 9 пикетов (900 м)", () => {
        const p: Picketage = [{ km: 5, picketCount: 9 }];
        expect(metersToKmPkM(5850, p)).toEqual({ km: 5, pk: 8, m: 50 });
        // км6 сдвинут на −100 м
        expect(kmPkMToMeters(6, 0, 0, p)).toBe(5900);
        expect(metersToKmPkM(5900, p)).toEqual({ km: 6, pk: 0, m: 0 });
    });

    it("рубленый пикет в середине: ПК1 = 120 м, ввод +110", () => {
        const p: Picketage = [{ km: 5, picketCount: 10, picketOverrides: { 1: 120 } }];
        expect(kmPkMToMeters(5, 1, 110, p)).toBe(5210);
        expect(metersToKmPkM(5210, p)).toEqual({ km: 5, pk: 1, m: 110 });
        // конец км5 = 5000 + 1020
        expect(kmPkMToMeters(6, 0, 0, p)).toBe(6020);
    });

    it("позиция до рубленого км не затронута", () => {
        const p: Picketage = [{ km: 5, picketCount: 11, picketOverrides: { 10: 43 } }];
        expect(metersToKmPkM(4500, p)).toEqual({ km: 4, pk: 5, m: 0 });
        expect(kmPkMToMeters(4, 5, 0, p)).toBe(4500);
    });

    it("несколько рубленых км — сдвиги накапливаются", () => {
        const p: Picketage = [
            { km: 5, picketCount: 11, picketOverrides: { 10: 43 } }, // +43
            { km: 8, picketCount: 9 }, // −100
        ];
        // км9: сдвиг = +43 − 100 = −57
        expect(kmPkMToMeters(9, 0, 0, p)).toBe(9000 - 57);
        expect(metersToKmPkM(9000 - 57, p)).toEqual({ km: 9, pk: 0, m: 0 });
    });

    it("round-trip с пикетажем", () => {
        const p: Picketage = [{ km: 5, picketCount: 11, picketOverrides: { 10: 43 } }];
        for (const meters of [0, 4999, 5000, 6019, 6043, 7000]) {
            const { km, pk, m } = metersToKmPkM(meters, p);
            expect(kmPkMToMeters(km, pk, m, p)).toBe(meters);
        }
    });

    it("formatOrdinateCompact показывает ПК10 в рубленом км", () => {
        const p: Picketage = [{ km: 5, picketCount: 11, picketOverrides: { 10: 43 } }];
        expect(formatOrdinateCompact(6020, p)).toBe("5км10пк+20");
    });
});

describe("formatKmPkM", () => {
    it("дополняет метры до двух знаков", () => {
        expect(formatKmPkM({ km: 4001, pk: 9, m: 5 })).toBe("КМ 4001 ПК 9+05");
        expect(formatKmPkM({ km: 1, pk: 2, m: 34 })).toBe("КМ 1 ПК 2+34");
    });
});
