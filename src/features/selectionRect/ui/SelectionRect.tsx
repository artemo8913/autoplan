import React from "react";
import { observer } from "mobx-react-lite";

import { useStore } from "@/app";

export const SelectionRect: React.FC = observer(() => {
    const { uiStore } = useStore();
    const { toolState } = uiStore;

    if (toolState.tool !== "multiSelect") return null;

    const { startPos, currentPos, candidateIds } = toolState;

    const x = Math.min(startPos.x, currentPos.x);
    const y = Math.min(startPos.y, currentPos.y);
    const width = Math.abs(currentPos.x - startPos.x);
    const height = Math.abs(currentPos.y - startPos.y);

    if (width < 1 && height < 1) return null;

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
            {candidateIds.length > 0 && (
                <g transform={`translate(${x + width}, ${y})`}>
                    <rect
                        x={4}
                        y={-16}
                        width={candidateIds.length > 9 ? 32 : 24}
                        height={18}
                        rx={4}
                        fill="#3b82f6"
                        opacity={0.9}
                    />
                    <text
                        x={candidateIds.length > 9 ? 20 : 16}
                        y={-4}
                        fontSize={11}
                        fontFamily="system-ui, sans-serif"
                        fontWeight={600}
                        fill="white"
                        textAnchor="middle"
                        dominantBaseline="middle"
                    >
                        {candidateIds.length}
                    </text>
                </g>
            )}
        </g>
    );
});

SelectionRect.displayName = "SelectionRect";
