import type { CatenaryPole } from "@/entities/catenaryPlanGraphic";
import { formatOrdinateCompact } from "@/shared/lib/measure";

export interface PoleSelectItem {
    value: string;
    label: string;
}

/**
 * Опции для выбора опоры: отсортированы по X, подпись содержит имя, координату (км/пк/м)
 * и привязанные пути — например «№5 · 4001км9пк+1 · Путь 2». Поиск Mantine Select по такой
 * подписи работает и по имени, и по километражу.
 */
export function buildPoleSelectData(poles: CatenaryPole[]): PoleSelectItem[] {
    return [...poles]
        .sort((a, b) => a.x - b.x)
        .map((p) => {
            const trackNames = p.trackBindings.map((b) => b.track.name);
            const trackPart =
                trackNames.length === 0
                    ? ""
                    : ` · ${trackNames.length > 1 ? "Пути" : "Путь"} ${trackNames.join("/")}`;
            return {
                value: p.id,
                label: `№${p.name} · ${formatOrdinateCompact(p.x)}${trackPart}`,
            };
        });
}

export interface PoleSelectGroup {
    group: string;
    items: PoleSelectItem[];
}

/**
 * Опции для границы АУ: сначала анкерные опоры — граница стоит на них, — затем остальные.
 * Обычную опору выбрать можно (override): сервис пометит её анкерной и скажет об этом тостом.
 * Пустые группы не выводятся.
 */
export function buildBoundaryPoleSelectData(poles: CatenaryPole[]): PoleSelectGroup[] {
    const anchors = poles.filter((p) => p.isAnchor);
    const others = poles.filter((p) => !p.isAnchor);

    return [
        { group: "Анкерные опоры", items: buildPoleSelectData(anchors) },
        { group: "Остальные (станет анкерной)", items: buildPoleSelectData(others) },
    ].filter((g) => g.items.length > 0);
}
