import { observer } from "mobx-react-lite";

import { useStore } from "@/app/store";
import { useServices } from "@/app/services";

import { getWireDashArray, getWireInsertSymbol } from "./gost-symbols";

export const WireLineLayer = observer(() => {
    const { wireLinesStore } = useStore();
    const { svgDrawer } = useServices();

    return (
        <g className="wireLineLayer">
            {wireLinesStore.list.map(line => {
                const poses = line.fixingPoints.map(fp => fp.endPos);
                const dPath = svgDrawer.calcSVGPath(poses);
                const symbol = line.label ?? getWireInsertSymbol(line.wireType);
                const dashArray = getWireDashArray(line.wireType);
                const markerPoints = line.fixingPoints.filter((_, i) => i % 3 === 1);

                return (
                    <g key={line.id}>
                        <path
                            d={dPath}
                            fill="none"
                            stroke="black"
                            strokeWidth={1.5}
                            strokeDasharray={dashArray}
                        />
                        {symbol && markerPoints.map((fp, i) => (
                            <text
                                key={i}
                                x={fp.endPos.x}
                                y={fp.endPos.y}
                                fontSize={6}
                                textAnchor="middle"
                            >
                                {symbol}
                            </text>
                        ))}
                    </g>
                );
            })}
        </g>
    );
});
