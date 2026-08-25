import { describe, it, expect } from "vitest";

import {
    buildContextMenuItems,
    type ContextMenuActionId,
    type ContextMenuContext,
    type ContextMenuItem,
} from "./buildContextMenuItems";

function ctx(overrides: Partial<ContextMenuContext> = {}): ContextMenuContext {
    return { selectedType: null, selectedCount: 0, canUndo: true, canRedo: true, ...overrides };
}

function actions(items: ContextMenuItem[]): ContextMenuActionId[] {
    return items.filter((i) => i.kind === "action").map((i) => i.action);
}

function labels(items: ContextMenuItem[]): string[] {
    return items.filter((i) => i.kind === "label").map((i) => i.text);
}

describe("buildContextMenuItems", () => {
    it("без выделения предлагает действия плана и не предлагает действий над объектами", () => {
        const items = buildContextMenuItems(ctx());

        expect(actions(items)).toEqual([
            "undo",
            "redo",
            "fitToPlan",
            "openTracksEditor",
            "openLinesEditor",
            "openJunctionsEditor",
        ]);
        expect(actions(items)).not.toContain("deleteSelection");
        expect(labels(items)).toEqual([]);
    });

    it("пустой undo-стек не выключает меню, а только гасит свои пункты", () => {
        const items = buildContextMenuItems(ctx({ canUndo: false, canRedo: false }));
        const undoRedo = items.filter((i) => i.kind === "action" && (i.action === "undo" || i.action === "redo"));

        expect(undoRedo).toHaveLength(2);
        expect(undoRedo.every((i) => i.kind === "action" && i.disabled)).toBe(true);
    });

    it("заголовок называет то, к чему применятся пункты", () => {
        expect(labels(buildContextMenuItems(ctx({ selectedType: "catenaryPole", selectedCount: 1 })))).toEqual([
            "Опора КС",
        ]);
        expect(labels(buildContextMenuItems(ctx({ selectedType: "catenaryPole", selectedCount: 3 })))).toEqual([
            "Опоры КС: 3",
        ]);
        expect(labels(buildContextMenuItems(ctx({ selectedType: "mixed", selectedCount: 5 })))).toEqual([
            "Разные объекты: 5",
        ]);
    });

    it("для одной опоры даёт свойства и удаление, но не поперечину", () => {
        const items = buildContextMenuItems(ctx({ selectedType: "catenaryPole", selectedCount: 1 }));

        expect(actions(items)).toEqual(["openPoleEditor", "clearSelection", "deleteSelection", "undo", "redo"]);
    });

    it("поперечину предлагает ровно на паре опор", () => {
        const two = actions(buildContextMenuItems(ctx({ selectedType: "catenaryPole", selectedCount: 2 })));
        const three = actions(buildContextMenuItems(ctx({ selectedType: "catenaryPole", selectedCount: 3 })));

        expect(two).toContain("createFlexibleCrossSpan");
        expect(two).toContain("createRigidCrossSpan");
        expect(three).not.toContain("createFlexibleCrossSpan");
        expect(three).not.toContain("createRigidCrossSpan");
    });

    it("для АУ, линий и точек фиксации ведёт в панель линий, а не в панель опор", () => {
        for (const type of ["anchorSection", "wireLine", "fixingPoint"] as const) {
            const items = actions(buildContextMenuItems(ctx({ selectedType: type, selectedCount: 1 })));
            expect(items).toContain("openLinesEditor");
            expect(items).not.toContain("openPoleEditor");
        }
    });

    it("у типов без своей панели остаются только общие действия над выделением", () => {
        for (const type of ["crossSpan", "disconnector", "vlPole"] as const) {
            const items = actions(buildContextMenuItems(ctx({ selectedType: type, selectedCount: 1 })));
            expect(items).toEqual(["clearSelection", "deleteSelection", "undo", "redo"]);
        }
    });

    it("удаление помечено как разрушительное и подписано горячей клавишей", () => {
        const items = buildContextMenuItems(ctx({ selectedType: "catenaryPole", selectedCount: 1 }));
        const del = items.find((i) => i.kind === "action" && i.action === "deleteSelection");

        expect(del).toMatchObject({ danger: true, shortcut: "Del" });
    });

    it("разделители не идут подряд и не начинают/заканчивают меню", () => {
        const cases: ContextMenuContext[] = [
            ctx(),
            ctx({ selectedType: "catenaryPole", selectedCount: 1 }),
            ctx({ selectedType: "catenaryPole", selectedCount: 2 }),
            ctx({ selectedType: "mixed", selectedCount: 4 }),
        ];

        for (const c of cases) {
            const kinds = buildContextMenuItems(c).map((i) => i.kind);
            expect(kinds[0]).not.toBe("divider");
            expect(kinds[kinds.length - 1]).not.toBe("divider");
            expect(kinds.some((kind, i) => kind === "divider" && kinds[i + 1] === "divider")).toBe(false);
        }
    });
});
