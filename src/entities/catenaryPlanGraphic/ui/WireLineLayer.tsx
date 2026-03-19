import { observer } from "mobx-react-lite";

import { getWireDashArray, getWireInsertSymbol } from "@/shared/ui/gost-symbols";
import { calcSvgPath } from "@/shared/svg/svgPath";
import { useStore } from "@/app";

export const WireLineLayer = observer(() => {
    const { wireLinesStore } = useStore();

    return (
        <g className="wireLineLayer">
            {wireLinesStore.list.map(line => {
                const poses = line.fixingPoints.map(fp => fp.endPos);
                const dPath = calcSvgPath(poses);
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
