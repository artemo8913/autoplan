import React from "react";
import { observer } from "mobx-react-lite";

import { formatKmPkM } from "@/shared/lib/measure";
import type { GabaritAxisSnap, NearbyTrackSnap } from "@/shared/types/toolTypes";
import type { Pos } from "@/shared/types/catenaryTypes";
import { useStore } from "@/app";

import { PolePreviewSymbol } from "./PolePreviewSymbol";

/** Пунктирная ось габарита: линия вдоль пути на том расстоянии, куда притянулась опора. */
const GabaritAxisGuide: React.FC<{ axis: GabaritAxisSnap; color: string }> = observer(({ axis, color }) => {
    const { tracksStore, cameraStore } = useStore();

    const { x, width } = cameraStore.viewBox;
    const track = tracksStore.tracks.get(axis.trackId);
    // Ось видна на всю ширину экрана, но не дальше самого пути
    const x1 = Math.max(x, track?.startX ?? x);
    const x2 = Math.min(x + width, track?.endX ?? x + width);

    if (x2 <= x1) {
        return null;
    }

    return (
        <line x1={x1} y1={axis.axisY} x2={x2} y2={axis.axisY} stroke={color} strokeWidth={0.75} strokeDasharray="8 4" />
    );
});

GabaritAxisGuide.displayName = "GabaritAxisGuide";

/** Пунктир от опоры до пути с подписью габарита. */
const GabaritTie: React.FC<{ pos: Pos; nearbyTrack: NearbyTrackSnap; color: string }> = ({
    pos,
    nearbyTrack,
    color,
}) => (
    <>
        <line
            x1={pos.x}
            y1={pos.y}
            x2={pos.x}
            y2={nearbyTrack.trackY}
            stroke="#555"
            strokeWidth={1}
            strokeDasharray="4 3"
            opacity={0.7}
        />
        <text
            x={pos.x + 3}
            y={(pos.y + nearbyTrack.trackY) / 2}
            fontSize={6}
            fontFamily="monospace"
            fill={color}
            dominantBaseline="middle"
            stroke="white"
            strokeWidth={2}
            paintOrder="stroke"
        >
            {Math.abs(nearbyTrack.offsetMeters).toFixed(1)}
        </text>
    </>
);

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
            {/* Ось габарита, к которой притянута опора */}
            {snap?.gabaritAxis && <GabaritAxisGuide axis={snap.gabaritAxis} color={color} />}

            {/* Пунктирные линии к ближайшим путям с габаритами */}
            {nearbyTracks?.map((t) => (
                <GabaritTie key={t.trackId} pos={pos} nearbyTrack={t} color={color} />
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
