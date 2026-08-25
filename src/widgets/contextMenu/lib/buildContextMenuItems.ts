import type { EntityType } from "@/shared/types/toolTypes";

/** Что умеет делать пункт меню. Диспетчеризация по id — в `ContextMenu`. */
export type ContextMenuActionId =
    | "openPoleEditor"
    | "createFlexibleCrossSpan"
    | "createRigidCrossSpan"
    | "openLinesEditor"
    | "openTracksEditor"
    | "openJunctionsEditor"
    | "clearSelection"
    | "deleteSelection"
    | "fitToPlan"
    | "undo"
    | "redo";

export interface ContextMenuActionItem {
    kind: "action";
    action: ContextMenuActionId;
    label: string;
    /** Горячая клавиша того же действия — подсказкой справа. */
    shortcut?: string;
    danger?: boolean;
    disabled?: boolean;
}

export type ContextMenuItem =
    | ContextMenuActionItem
    | { kind: "divider" }
    | { kind: "label"; text: string };

export interface ContextMenuContext {
    selectedType: EntityType | "mixed" | null;
    selectedCount: number;
    canUndo: boolean;
    canRedo: boolean;
}

/**
 * Названия типов для заголовка меню.
 * `other` — именительный множественного числа: заголовок всегда вида «Опоры КС: 3».
 */
const TYPE_TITLES: Record<EntityType, { one: string; other: string }> = {
    catenaryPole: { one: "Опора КС", other: "Опоры КС" },
    vlPole: { one: "Опора ВЛ", other: "Опоры ВЛ" },
    fixingPoint: { one: "Точка фиксации", other: "Точки фиксации" },
    wireLine: { one: "Линия", other: "Линии" },
    anchorSection: { one: "Анкерный участок", other: "Анкерные участки" },
    crossSpan: { one: "Поперечина", other: "Поперечины" },
    disconnector: { one: "Разъединитель", other: "Разъединители" },
};

/** Типы, свойства которых редактируются в панели линий (АУ и ВЛ). */
const LINES_PANEL_TYPES: ReadonlySet<EntityType | "mixed"> = new Set<EntityType>([
    "anchorSection",
    "wireLine",
    "fixingPoint",
]);

function describeSelection(type: EntityType | "mixed" | null, count: number): string {
    if (type === null || type === "mixed") {
        return `Разные объекты: ${count}`;
    }
    const title = TYPE_TITLES[type];
    return count === 1 ? title.one : `${title.other}: ${count}`;
}

const UNDO_REDO = (canUndo: boolean, canRedo: boolean): ContextMenuItem[] => [
    { kind: "action", action: "undo", label: "Отменить", shortcut: "Ctrl+Z", disabled: !canUndo },
    { kind: "action", action: "redo", label: "Повторить", shortcut: "Ctrl+Y", disabled: !canRedo },
];

/**
 * Состав контекстного меню по контексту выделения — чистая функция, без сторов.
 *
 * Ничего не выделено — меню плана (навигация и панели); есть выделение — заголовок
 * с тем, к чему применятся пункты, затем действия по типу выделенного.
 */
export function buildContextMenuItems({
    selectedType,
    selectedCount,
    canUndo,
    canRedo,
}: ContextMenuContext): ContextMenuItem[] {
    if (selectedCount === 0) {
        return [
            ...UNDO_REDO(canUndo, canRedo),
            { kind: "divider" },
            { kind: "action", action: "fitToPlan", label: "Вписать план в экран" },
            { kind: "divider" },
            { kind: "action", action: "openTracksEditor", label: "Участок и пути…" },
            { kind: "action", action: "openLinesEditor", label: "Анкерные участки и линии…" },
            { kind: "action", action: "openJunctionsEditor", label: "Сопряжения…" },
        ];
    }

    const items: ContextMenuItem[] = [{ kind: "label", text: describeSelection(selectedType, selectedCount) }];

    if (selectedType === "catenaryPole") {
        items.push({
            kind: "action",
            action: "openPoleEditor",
            label: selectedCount === 1 ? "Свойства опоры…" : "Свойства опор…",
        });

        // Поперечина — это ровно пара опор, поэтому предлагаем её только при двух выделенных.
        if (selectedCount === 2) {
            items.push(
                { kind: "action", action: "createFlexibleCrossSpan", label: "Гибкая поперечина между опорами" },
                { kind: "action", action: "createRigidCrossSpan", label: "Жёсткая поперечина между опорами" },
            );
        }
    } else if (selectedType !== null && LINES_PANEL_TYPES.has(selectedType)) {
        items.push({ kind: "action", action: "openLinesEditor", label: "Анкерные участки и линии…" });
    }

    items.push(
        { kind: "divider" },
        { kind: "action", action: "clearSelection", label: "Снять выделение", shortcut: "Esc" },
        { kind: "action", action: "deleteSelection", label: "Удалить", shortcut: "Del", danger: true },
        { kind: "divider" },
        ...UNDO_REDO(canUndo, canRedo),
    );

    return items;
}
