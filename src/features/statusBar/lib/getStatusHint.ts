import type { ToolState } from "@/app";
import type { PlaceableEntityConfig } from "@/shared/types/toolTypes";

function getPlacementLabel(cfg: PlaceableEntityConfig): string {
    switch (cfg.kind) {
        case "catenaryPole": {
            const matLabel = cfg.material === "metal" ? "металлическая" : "бетонная";
            return `Опора КС (${matLabel})`;
        }
        case "vlPole": {
            const vlLabels = { intermediate: "промежуточная", angular: "угловая", terminal: "концевая" };
            return `Опора ВЛ (${vlLabels[cfg.vlType]})`;
        }
        case "building":
            return "Здание";
        case "signal":
            return "Светофор";
        case "platform":
            return "Платформа";
        case "crossing":
            return "Переезд";
        case "spotlight":
            return "Прожекторная мачта";
    }
}

export function getStatusHint(toolState: ToolState): string {
    switch (toolState.tool) {
        case "panTool":
            return "Режим перемещения · ЛКМ — перемещение холста · Колесо — масштаб";
        case "idle":
            return "Инструмент выделения · Клик — выбрать · Drag — рамка";
        case "selection": {
            const count = toolState.selectedIds.length;
            const noun = count === 1 ? "объект" : "объектов";
            return `Выбрано: ${count} ${noun} · Del — удалить · Shift+клик — добавить к выделению · ESC — снять`;
        }
        case "dragPan":
            return "Перемещение холста...";
        case "placement": {
            const name = getPlacementLabel(toolState.entityConfig);
            const repeat = toolState.isRepeating ? " (серийное размещение)" : "";
            return `${name}${repeat} · Клик — разместить · Ctrl+клик — серия · Tab — сменить тип · ESC — отмена`;
        }
        case "multiSelect":
            return `Рамка выделения · Объектов в рамке: ${toolState.candidateIds.length}`;
        case "wireDrawing": {
            const n = toolState.placedPoints.length;
            if (n === 0) {
                return "Кликните на точку фиксации для начала линии · ESC — отмена";
            }
            return `Точек: ${n} · Клик — добавить · Enter — завершить · Backspace — убрать последнюю · ESC — отмена`;
        }
        case "crossSpan":
            if (!toolState.poleAId) {
                return "Кликните на первую опору · ESC — отмена";
            }
            return "Кликните на вторую опору · ESC — отмена";
    }
}
