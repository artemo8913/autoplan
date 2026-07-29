import type { FC } from "react";
import { observer } from "mobx-react-lite";

import { useStore } from "@/app";

import type { FixingPoint } from "../model/FixingPoint";

interface FixingPointFigureProps {
    fixingPoint: FixingPoint;
}

const FixingPointFigure: FC<FixingPointFigureProps> = observer(({ fixingPoint }) => {
    const { displaySettingsStore } = useStore();
    const { startPos, endPos } = fixingPoint;

    return (
        <line
            x1={startPos.x} y1={startPos.y}
            x2={endPos.x} y2={endPos.y}
            stroke="black"
            strokeWidth={displaySettingsStore.fixingPointStrokeWidth}
        />
    );
});


export const FixingPointsLayer = observer(() => {
    const { fixingPointsStore } = useStore();
    return (
        <g className="fixingPointsLayer">
            {fixingPointsStore.list.map(
                fp => <FixingPointFigure key={fp.id} fixingPoint={fp} />
            )}
        </g>
    );
});
