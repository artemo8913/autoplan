import { observer } from "mobx-react-lite";

import { useStore } from "@/app";

import type { FixingPoint } from "../model/FixingPoint";

interface FixingPointFigureProps {
    fixingPoint: FixingPoint;
}

/**
 * Консоль одной ТФ. Собственный observer: сдвиг опоры перерисовывает только её ТФ,
 * а не весь слой.
 *
 * У ТФ на ригеле и в сооружении консоли нет — начало и конец совпадают, рисовать нечего.
 */
function FixingPointFigureBase({ fixingPoint }: FixingPointFigureProps) {
    const { displaySettingsStore, selectionStore } = useStore();
    const { startPos, endPos } = fixingPoint;
    const isSelected = selectionStore.isSelected(fixingPoint.id);
    const cls = ["svg-clickable", isSelected ? "svg-clickable--selected" : ""].filter(Boolean).join(" ");
    const strokeWidth = displaySettingsStore.fixingPointStrokeWidth;

    return (
        <g className={cls}>
            <line
                x1={startPos.x} y1={startPos.y}
                x2={endPos.x} y2={endPos.y}
                stroke={isSelected ? "blue" : "black"}
                strokeWidth={strokeWidth}
            />
            {/* Прозрачная широкая линия — расширяет зону наведения для hover-подсветки */}
            <line
                x1={startPos.x} y1={startPos.y}
                x2={endPos.x} y2={endPos.y}
                stroke="transparent"
                strokeWidth={strokeWidth * 6}
            />
        </g>
    );
}

// observer сам оборачивает компонент в React.memo — отдельный memo не нужен.
const FixingPointFigure = observer(FixingPointFigureBase);

function FixingPointsLayerBase() {
    const { fixingPointsStore } = useStore();
    return (
        <g className="fixingPointsLayer">
            {fixingPointsStore.list.map((fp) => (
                <FixingPointFigure key={fp.id} fixingPoint={fp} />
            ))}
        </g>
    );
}

export const FixingPointsLayer = observer(FixingPointsLayerBase);
