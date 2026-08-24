import { expect } from "vitest";

import type { PlanDTO } from "@/shared/types/planTypes";

import type { PlanEntityStores } from "../types";
import type { UndoStackStore } from "../store/UndoStackStore";
import { PlanSerializationService } from "./PlanSerializationService";

const META = { id: "t", name: "t", createdAt: "", updatedAt: "" };
const serializer = new PlanSerializationService();

/**
 * Снимок плана для сравнения «до / после отката».
 * Порядок в Map-сторах игнорируется: undo кладёт восстановленную сущность в конец,
 * и это не изменение плана. Порядок ВНУТРИ сущностей (ТФ в АУ и в линии ВЛ) значим — не трогаем.
 */
export function planSnapshot(stores: PlanEntityStores): string {
    const dto = serializer.toDTO(META, stores) as PlanDTO & Record<string, unknown>;
    const byId = <T extends { id: string }>(arr: T[] | undefined) =>
        [...(arr ?? [])].sort((a, b) => a.id.localeCompare(b.id));

    return JSON.stringify({
        railway: dto.railway,
        tracks: byId(dto.tracks),
        catenaryPoles: byId(dto.catenaryPoles),
        vlPoles: byId(dto.vlPoles),
        fixingPoints: byId(dto.fixingPoints),
        anchorSections: byId(dto.anchorSections),
        junctions: byId(dto.junctions),
        wireLines: byId(dto.wireLines),
        crossSpans: byId(dto.crossSpans),
        disconnectors: byId(dto.disconnectors),
    });
}

/**
 * Инвариант обратимости (решение по п. 5.1: undo остаётся на командах — значит,
 * обратимость каждой операции проверяется тестом, а не гарантируется формой хранения).
 *
 * Выполняет `mutate()`, откатывает ВСЕ порождённые ею команды и требует, чтобы план
 * совпал с исходным DTO; затем повторяет их через redo и требует совпадения с результатом.
 * Ловит именно тот класс ошибок, ради которого рассматривались снимки: забытую инверсию каскада.
 */
export function expectUndoRestoresPlan(
    stores: PlanEntityStores,
    undoStackStore: UndoStackStore,
    mutate: () => void,
): void {
    const before = planSnapshot(stores);
    const depthBefore = undoStackStore.undoStack.length;

    mutate();

    const after = planSnapshot(stores);
    const steps = undoStackStore.undoStack.length - depthBefore;
    expect(steps, "операция не попала в undo-стек").toBeGreaterThan(0);

    for (let i = 0; i < steps; i++) {
        undoStackStore.undo();
    }
    expect(planSnapshot(stores), "undo не вернул план в исходное состояние").toBe(before);

    for (let i = 0; i < steps; i++) {
        undoStackStore.redo();
    }
    expect(planSnapshot(stores), "redo не повторил операцию").toBe(after);
}
