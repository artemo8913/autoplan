import React from "react";
import { observer } from "mobx-react-lite";

import { useStore } from "@/app";

export const CrossSpanPlacementPreview: React.FC = observer(() => {
    const { toolStateStore, polesStore, displaySettingsStore } = useStore();

    const { toolState } = toolStateStore;

    const baseStroke = displaySettingsStore.baseStroke;

    if (toolState.tool === "crossSpan" && toolState.poleAId && toolState.previewPoleBId) {
        const poleA = polesStore.poles.get(toolState.poleAId!);
        const poleB = polesStore.poles.get(toolState.previewPoleBId!);

        if (!poleA || !poleB) {
            return null;
        }

        const isFlexible = toolState.spanType === "flexible";

        return (
            <line
                x1={poleA.pos.x}
                y1={poleA.pos.y}
                x2={poleB.pos.x}
                y2={poleB.pos.y}
                stroke="gray"
                strokeWidth={isFlexible ? baseStroke : baseStroke * 2}
                strokeDasharray="4,4"
                opacity={0.5}
                className="svg-no-pointer-events"
            />
        );
    }
});

CrossSpanPlacementPreview.displayName = "CrossSpanPlacementPreview";
