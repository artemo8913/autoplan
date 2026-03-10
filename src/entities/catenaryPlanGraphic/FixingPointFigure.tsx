import type { FC } from "react";
import { observer } from "mobx-react-lite";

import type { FixingPoint } from "../lib/FixingPoint";

interface FixingPointFigureProps {
    fixingPoint: FixingPoint;
}

export const FixingPointFigure: FC<FixingPointFigureProps> = observer(({ fixingPoint }) => {
    const { startPos, endPos } = fixingPoint;
    
    return (
        <line
            x1={startPos.x} y1={startPos.y}
            x2={endPos.x} y2={endPos.y}
            stroke="black"
            strokeWidth={1}
        />
    );
});
