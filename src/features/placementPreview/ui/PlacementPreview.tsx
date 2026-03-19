import React from "react";
import { observer } from "mobx-react-lite";

import { useStore } from "@/app";
import { formatKmPkM } from "@/shared/lib/measure";

const PolePreviewSymbol: React.FC<{ kind: string; vlType?: string }> = ({ kind, vlType }) => {
    if (kind === "catenaryPole") {
        return (
            <g>
                <rect x={-3} y={-15} width={6} height={30} fill="currentColor" />
            </g>
        );
    }

    if (kind === "vlPole") {
        switch (vlType) {
            case "intermediate":
                return <circle cx={0} cy={0} r={6} fill="none" stroke="currentColor" strokeWidth={1.5} />;
            case "angular":
                return <polygon points="0,-7 6,5 -6,5" fill="none" stroke="currentColor" strokeWidth={1.5} />;
            case "terminal":
                return (
                    <rect x={-5} y={-5} width={10} height={10} fill="none" stroke="currentColor" strokeWidth={1.5} />
                );
            default:
                return <circle cx={0} cy={0} r={6} fill="none" stroke="currentColor" strokeWidth={1.5} />;
        }
    }
    return <circle cx={0} cy={0} r={5} fill="none" stroke="currentColor" strokeWidth={1} />;
};

export const PlacementPreview: React.FC = observer(() => {
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
                <PolePreviewSymbol kind={config.kind} vlType={config.kind === "vlPole" ? config.vlType : undefined} />
            </g>

            {/* Перекрестие */}
            <line
                x1={pos.x - 12}
                y1={pos.y}
                x2={pos.x + 12}
                y2={pos.y}
                stroke={color}
                strokeWidth={0.4}
                opacity={0.5}
            />
            <line
                x1={pos.x}
                y1={pos.y - 12}
                x2={pos.x}
                y2={pos.y + 12}
                stroke={color}
                strokeWidth={0.4}
                opacity={0.5}
            />

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

PlacementPreview.displayName = "PlacementPreview";
