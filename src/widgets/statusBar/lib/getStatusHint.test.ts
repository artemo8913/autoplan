import { describe, it, expect } from "vitest";

import type { ToolState } from "@/app";

import { getStatusHint } from "./getStatusHint";

const ts = (partial: Record<string, unknown>) => partial as unknown as ToolState;

describe("getStatusHint", () => {
    it("перетаскивание сущностей", () => {
        expect(getStatusHint(ts({ tool: "dragEntities" }), 0)).toBe(
            "Перемещение · Shift — ограничить ось · ESC — отмена",
        );
    });

    it("есть выделение (вне placement/multiSelect) — единственное число", () => {
        expect(getStatusHint(ts({ tool: "idle" }), 1)).toBe(
            "Выбрано: 1 объект · Del — удалить · Drag — переместить · Shift+клик — добавить · ESC — снять",
        );
    });

    it("есть выделение — множественное число", () => {
        expect(getStatusHint(ts({ tool: "idle" }), 3)).toContain("Выбрано: 3 объектов");
    });

    it("при placement выделение игнорируется → подсказка размещения", () => {
        const hint = getStatusHint(ts({ tool: "placement", entityConfig: { kind: "catenaryPole", material: "metal" }, isMultiple: false }), 5);
        expect(hint).toBe("Опора КС (металлическая) · Клик — разместить · Ctrl+клик — серия · ESC — отмена");
    });

    it("placement: бетонная опора + серийный режим", () => {
        const hint = getStatusHint(ts({ tool: "placement", entityConfig: { kind: "catenaryPole", material: "concrete" }, isMultiple: true }), 0);
        expect(hint).toBe("Опора КС (бетонная) (серийное размещение) · Клик — разместить · Ctrl+клик — серия · ESC — отмена");
    });

    it("placement: опора ВЛ по типу", () => {
        const hint = getStatusHint(ts({ tool: "placement", entityConfig: { kind: "vlPole", vlType: "angular" }, isMultiple: false }), 0);
        expect(hint).toContain("Опора ВЛ (угловая)");
    });

    it.each([
        [{ kind: "building" }, "Здание"],
        [{ kind: "signal" }, "Светофор"],
        [{ kind: "platform" }, "Платформа"],
        [{ kind: "crossing" }, "Переезд"],
        [{ kind: "spotlight" }, "Прожекторная мачта"],
        [{ kind: "disconnector", controlType: "manual", phaseCount: 1 }, "Разъединитель"],
    ])("placement label %#", (entityConfig, label) => {
        const hint = getStatusHint(ts({ tool: "placement", entityConfig, isMultiple: false }), 0);
        expect(hint.startsWith(label)).toBe(true);
    });

    it.each([
        ["panTool", "Режим перемещения · ЛКМ — перемещение холста · Колесо — масштаб"],
        ["idle", "Инструмент выделения · Клик — выбрать · Drag — рамка"],
        ["dragPan", "Перемещение холста..."],
        ["multiSelect", "Рамка выделения · Отпустите для выбора"],
    ])("инструмент %s без выделения", (tool, expected) => {
        expect(getStatusHint(ts({ tool }), 0)).toBe(expected);
    });

    it("crossSpan: до и после выбора первой опоры", () => {
        expect(getStatusHint(ts({ tool: "crossSpan", poleAId: null }), 0)).toBe("Кликните на первую опору · ESC — отмена");
        expect(getStatusHint(ts({ tool: "crossSpan", poleAId: "p1" }), 0)).toBe("Кликните на вторую опору · ESC — отмена");
    });
});
