import { observer } from "mobx-react-lite";

import { DisconnectorSymbol } from "@/shared/ui/gost-symbols";
import { useStore } from "@/app";

export const DisconnectorLayer = observer(() => {
    const { disconnectorsStore, selectionStore, displaySettingsStore } = useStore();

    return (
        <g className="disconnectorLayer">
            {disconnectorsStore.list.map((d) => {
                const isSelected = selectionStore.isSelected(d.id);
                const pos = d.pos;
                const cls = ["svg-clickable", isSelected ? "svg-clickable--selected" : ""].filter(Boolean).join(" ");

                return (
                    <g key={d.id} transform={`translate(${pos.x}, ${pos.y})`} className={cls}>
                        <DisconnectorSymbol
                            state={d.state}
                            poles={d.phaseCount}
                            s={displaySettingsStore.baseStroke}
                            color={isSelected ? "blue" : "black"}
                        />
                        <text
                            x={0}
                            y={-12}
                            fontSize={displaySettingsStore.vlPoleLabelFontSize}
                            fontFamily="monospace"
                            fontWeight="bold"
                            textAnchor="middle"
                            fill={isSelected ? "blue" : "black"}
                            className="svg-no-pointer-events"
                        >
                            {d.name}
                        </text>
                    </g>
                );
            })}
        </g>
    );
});
