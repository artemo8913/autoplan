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
                const stroke = isSelected ? "blue" : "black";

                if (isFlexible) {
                    // Гибкая поперечина — сплошная одинарная линия
                    return (
                        <line
                            key={cs.id}
                            x1={posA.x}
                            y1={posA.y}
                            x2={posB.x}
                            y2={posB.y}
                            stroke={stroke}
                            strokeWidth={baseStroke}
                            className="svg-clickable"
                        />
                    );
                }

                // Жесткая поперечина — две параллельные линии
                const dx = posB.x - posA.x;
                const dy = posB.y - posA.y;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                const perpX = (-dy / len) * baseStroke;
                const perpY = (dx / len) * baseStroke;

                return (
                    <g key={cs.id} className="svg-clickable">
                        <line
                            x1={posA.x + perpX}
                            y1={posA.y + perpY}
                            x2={posB.x + perpX}
                            y2={posB.y + perpY}
                            stroke={stroke}
                            strokeWidth={baseStroke}
                        />
                        <line
                            x1={posA.x - perpX}
                            y1={posA.y - perpY}
                            x2={posB.x - perpX}
                            y2={posB.y - perpY}
                            stroke={stroke}
                            strokeWidth={baseStroke}
                        />
                        {/* Прозрачная широкая линия для hit-test */}
                        <line
                            x1={posA.x}
                            y1={posA.y}
                            x2={posB.x}
                            y2={posB.y}
                            stroke="transparent"
                            strokeWidth={baseStroke * 6}
                        />
                    </g>
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
                            strokeDasharray="4,4"
                            opacity={0.5}
                            className="svg-no-pointer-events"
                        />
                    );
                })()}
        </g>
    );
});
