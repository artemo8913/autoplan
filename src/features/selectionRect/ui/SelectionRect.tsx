import React from "react";
import { observer } from "mobx-react-lite";

import { useStore } from "@/app";

export const SelectionRect: React.FC = observer(() => {
    const { toolStateStore } = useStore();
    const { toolState } = toolStateStore;

    if (toolState.tool !== "multiSelect") {
        return null;
    }

    const { startPos, currentPos } = toolState;

    const x = Math.min(startPos.x, currentPos.x);
    const y = Math.min(startPos.y, currentPos.y);
    const width = Math.abs(currentPos.x - startPos.x);
    const height = Math.abs(currentPos.y - startPos.y);

    if (width < 1 && height < 1) {
        return null;
    }

    return (
        <g className="selection-rect" style={{ pointerEvents: "none" }}>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                fill="#3b82f6"
                fillOpacity={0.08}
                stroke="#3b82f6"
                strokeWidth={1}
                strokeDasharray="6 3"
            />
        </g>
    );
});

SelectionRect.displayName = "SelectionRect";
