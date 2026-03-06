import { observer } from "mobx-react-lite";

import { useStore } from "@/app/store";
import { VlPoleSymbol } from "./gost-symbols";

export const VlPoleLayer = observer(() => {
    const { vlPolesStore } = useStore();
    return (
        <g className="vlPoleLayer">
            {vlPolesStore.list.map(p => (
                <g key={p.id} transform={`translate(${p.x}, ${p.y})`}>
                    <VlPoleSymbol type={p.vlType} size={p.radius} />
                </g>
            ))}
        </g>
    );
});
