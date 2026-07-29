import { describe, it, expect } from "vitest";

import type { NonStandardKm, Picketage } from "@/shared/types/catenaryTypes";

import {
    addNonStandardKm,
    availablePicketIndices,
    findEntry,
    kmPkMLimits,
    picketCountForKm,
    picketLengthForKmPk,
    removeNonStandardKm,
    removePicketOverride,
    renameKm,
    setPicketCount,
    setPicketOverride,
    sortedOverrides,
    validateKmNumber,
    validatePicketLength,
} from "./picketageOps";

describe("picketageOps: трансформы", () => {
    it("addNonStandardKm добавляет стандартный км (10 ПК) и сортирует", () => {
        const p = addNonStandardKm(addNonStandardKm([], 8), 5);
        expect(p.map((e) => e.km)).toEqual([5, 8]);
        expect(p[0]).toEqual({ km: 5, picketCount: 10 });
    });

    it("addNonStandardKm — no-op если км уже есть", () => {
        const p: Picketage = [{ km: 5, picketCount: 11 }];
        expect(addNonStandardKm(p, 5)).toBe(p);
    });

    it("removeNonStandardKm убирает запись", () => {
        const p: Picketage = [
            { km: 5, picketCount: 10 },
            { km: 8, picketCount: 9 },
        ];
        expect(removeNonStandardKm(p, 5).map((e) => e.km)).toEqual([8]);
    });

    it("renameKm переименовывает и сортирует; no-op если занято", () => {
        const p: Picketage = [
            { km: 5, picketCount: 10 },
            { km: 8, picketCount: 10 },
        ];
        expect(renameKm(p, 5, 9).map((e) => e.km)).toEqual([8, 9]);
        expect(renameKm(p, 5, 8)).toBe(p);
    });

    it("setPicketCount задаёт число ПК и чистит осиротевшие отклонения (idx ≥ count)", () => {
        const p: Picketage = [{ km: 5, picketCount: 11, picketOverrides: { 2: 120, 10: 43 } }];
        const r = setPicketCount(p, 5, 9);
        expect(r[0].picketCount).toBe(9);
        expect(r[0].picketOverrides).toEqual({ 2: 120 });
    });

    it("setPicketCount зажимает к 1 и убирает пустой словарь отклонений", () => {
        const p: Picketage = [{ km: 5, picketCount: 11, picketOverrides: { 10: 43 } }];
        expect(setPicketCount(p, 5, 0)[0].picketCount).toBe(1);
        expect(setPicketCount(p, 5, 5)[0].picketOverrides).toBeUndefined();
    });

    it("setPicketOverride задаёт длину; 100 не хранится (разрежённость)", () => {
        const p: Picketage = [{ km: 5, picketCount: 10 }];
        expect(setPicketOverride(p, 5, 3, 120)[0].picketOverrides).toEqual({ 3: 120 });
        const withOv = setPicketOverride(p, 5, 3, 120);
        expect(setPicketOverride(withOv, 5, 3, 100)[0].picketOverrides).toBeUndefined();
    });

    it("setPicketOverride игнорирует индекс вне диапазона", () => {
        const p: Picketage = [{ km: 5, picketCount: 10 }];
        expect(setPicketOverride(p, 5, 10, 50)[0].picketOverrides).toBeUndefined();
    });

    it("removePicketOverride возвращает пикет к 100", () => {
        const p: Picketage = [{ km: 5, picketCount: 10, picketOverrides: { 3: 120, 4: 75 } }];
        expect(removePicketOverride(p, 5, 3)[0].picketOverrides).toEqual({ 4: 75 });
    });
});

describe("picketageOps: хелперы UI", () => {
    it("sortedOverrides — по возрастанию номера ПК", () => {
        const e: NonStandardKm = { km: 5, picketCount: 11, picketOverrides: { 10: 43, 2: 120 } };
        expect(sortedOverrides(e)).toEqual([
            { idx: 2, lengthM: 120 },
            { idx: 10, lengthM: 43 },
        ]);
    });

    it("availablePicketIndices — 0..count-1 минус переопределённые", () => {
        const e: NonStandardKm = { km: 5, picketCount: 5, picketOverrides: { 1: 120, 3: 75 } };
        expect(availablePicketIndices(e)).toEqual([0, 2, 4]);
    });

    it("findEntry", () => {
        const p: Picketage = [{ km: 5, picketCount: 10 }];
        expect(findEntry(p, 5)?.picketCount).toBe(10);
        expect(findEntry(p, 6)).toBeUndefined();
    });
});

describe("picketageOps: лимиты ввода", () => {
    const p: Picketage = [{ km: 5, picketCount: 11, picketOverrides: { 1: 120, 10: 43 } }];

    it("picketCountForKm — из записи или стандартные 10", () => {
        expect(picketCountForKm(p, 5)).toBe(11);
        expect(picketCountForKm(p, 6)).toBe(10);
    });

    it("picketLengthForKmPk — отклонение или 100", () => {
        expect(picketLengthForKmPk(p, 5, 1)).toBe(120);
        expect(picketLengthForKmPk(p, 5, 0)).toBe(100);
        expect(picketLengthForKmPk(p, 6, 0)).toBe(100);
    });

    it("kmPkMLimits — maxPk = count-1, maxM = длина пикета-1", () => {
        expect(kmPkMLimits(p, 5, 10)).toEqual({ maxPk: 10, maxM: 42 });
        expect(kmPkMLimits(p, 5, 1)).toEqual({ maxPk: 10, maxM: 119 });
        expect(kmPkMLimits([], 5, 3)).toEqual({ maxPk: 9, maxM: 99 });
    });
});

describe("picketageOps: валидация", () => {
    it("validateKmNumber — целое, в границах, уникальное", () => {
        expect(validateKmNumber(5, 0, 10, [])).toEqual({ ok: true });
        expect(validateKmNumber(5.5, 0, 10, []).ok).toBe(false);
        expect(validateKmNumber(11, 0, 10, []).ok).toBe(false);
        expect(validateKmNumber(5, 0, 10, [5]).ok).toBe(false);
    });

    it("validatePicketLength — целое > 0", () => {
        expect(validatePicketLength(75)).toEqual({ ok: true });
        expect(validatePicketLength(0).ok).toBe(false);
        expect(validatePicketLength(-5).ok).toBe(false);
        expect(validatePicketLength(75.5).ok).toBe(false);
    });
});
