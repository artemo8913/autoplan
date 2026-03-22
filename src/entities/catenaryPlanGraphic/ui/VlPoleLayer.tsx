import { observer } from "mobx-react-lite";

import { VlPoleSymbol } from "@/shared/ui/gost-symbols";
import { useStore } from "@/app";

export const VlPoleLayer = observer(() => {
    const { vlPolesStore, selectionStore } = useStore();
    return (
        <g className="vlPoleLayer">
            {vlPolesStore.list.map((p) => {
                const isSelected = selectionStore.isSelected(p.id);
                const cls = ["svg-clickable", isSelected ? "pole--selected" : ""].filter(Boolean).join(" ");

                return (
                    <g key={p.id} transform={`translate(${p.x}, ${p.y})`} className={cls}>
                        <VlPoleSymbol type={p.vlType} size={p.radius} />
                        <text
                            x={p.radius + 3}
                            y={0}
                            fontSize={8}
                            fontFamily="monospace"
                            dominantBaseline="middle"
                            fill="black"
                            className="svg-no-pointer-events"
                        >
                            {p.name}
                        </text>
                    </g>
                );
            })}
        </g>
    );
});
