import { observer } from "mobx-react-lite";

import { FlexibleCrossSpan } from "@/entities/catenaryPlanGraphic";
import { useStore } from "@/app";

export const CrossSpanLayer = observer(() => {
    const { crossSpansStore, selectionStore, toolStateStore, polesStore, displaySettingsStore } = useStore();

    const baseStroke = displaySettingsStore.baseStroke;

    return (
        <g className="crossSpanLayer">
            {crossSpansStore.list.map((cs) => {
                const isSelected = selectionStore.isSelected(cs.id);
                const posA = cs.poleA.pos;
                const posB = cs.poleB.pos;
                const isFlexible = cs instanceof FlexibleCrossSpan;

                return (
                    <line
                        key={cs.id}
                        x1={posA.x}
                        y1={posA.y}
                        x2={posB.x}
                        y2={posB.y}
                        stroke={isSelected ? "blue" : "black"}
                        strokeWidth={isFlexible ? baseStroke : baseStroke * 2}
                        strokeDasharray={isFlexible ? "8,4" : undefined}
                        className="svg-clickable"
                    />
                );
            })}
            {/* Превью линии при создании поперечины */}
            {toolStateStore.toolState.tool === "crossSpan" &&
                toolStateStore.toolState.poleAId &&
                toolStateStore.toolState.previewPoleBId && (() => {
                    const poleA = polesStore.poles.get(toolStateStore.toolState.poleAId!);
                    const poleB = polesStore.poles.get(toolStateStore.toolState.previewPoleBId!);
                    if (!poleA || !poleB) {
                        return null;
                    }
                    const isFlexible = toolStateStore.toolState.spanType === "flexible";
                    return (
                        <line
                            x1={poleA.pos.x}
                            y1={poleA.pos.y}
                            x2={poleB.pos.x}
                            y2={poleB.pos.y}
                            stroke="gray"
                            strokeWidth={isFlexible ? baseStroke : baseStroke * 2}
                            strokeDasharray={isFlexible ? "8,4" : "4,4"}
                            opacity={0.5}
                            className="svg-no-pointer-events"
                        />
                    );
                })()}
        </g>
    );
});
