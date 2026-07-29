import React from "react";
import { observer } from "mobx-react-lite";

import { formatKmPkM } from "@/shared/lib/measure";
import { useStore } from "@/app";

import { PolePreviewSymbol } from "./PolePreviewSymbol";

export const PolePlacementPreview: React.FC = observer(() => {
    const { toolStateStore } = useStore();

    const { toolState } = toolStateStore;

    if (toolState.tool !== "placement") {
        return null;
    }

    if (!toolState.previewPos) {
        return null;
    }

    const pos = toolState.previewPos;
    const snap = toolState.snapInfo;
    const config = toolState.entityConfig;
    const color = snap?.snappedTo === "track" ? "#16a34a" : "#6b7280";
    const nearbyTracks = snap?.nearbyTracks;

    let labelText = "";

    if (snap) {
        const coords = formatKmPkM({ km: snap.km ?? 0, pk: snap.pk ?? 0, m: snap.m ?? 0 });
        if (snap.globalY !== undefined) {
            labelText = `${coords} | Y: ${snap.globalY}`;
        } else {
            labelText = coords;
        }
    }

    return (
        <g className="placement-preview" style={{ pointerEvents: "none" }}>
            {/* Пунктирные линии к ближайшим путям */}
            {nearbyTracks?.map((t) => (
                <line
                    key={t.trackId}
                    x1={pos.x}
                    y1={pos.y}
                    x2={pos.x}
                    y2={t.trackY}
                    stroke="#555"
                    strokeWidth={1}
                    strokeDasharray="4 3"
                    opacity={0.7}
                />
            ))}

            <g transform={`translate(${pos.x}, ${pos.y})`} opacity={0.6} color={color}>
                <PolePreviewSymbol config={config} />
            </g>

            {/* Label */}
            {labelText && (
                <g transform={`translate(${pos.x + 14}, ${pos.y - 20})`}>
                    <rect
                        x={-2}
                        y={-10}
                        width={labelText.length * 5.5 + 8}
                        height={16}
                        rx={3}
                        fill="white"
                        stroke={color}
                        strokeWidth={0.5}
                        opacity={0.9}
                    />
                    <text fontSize={9} fontFamily="monospace" fill={color} dominantBaseline="middle" x={2} y={-1}>
                        {labelText}
                    </text>
                </g>
            )}
        </g>
    );
});

PolePlacementPreview.displayName = "PolePlacementPreview";
