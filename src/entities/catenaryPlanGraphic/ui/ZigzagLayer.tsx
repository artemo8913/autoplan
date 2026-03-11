import type { FC } from "react";
import { observer } from "mobx-react-lite";

import { ZigzagSymbol } from "@/shared/ui/gost-symbols";
import { ZIGZAG_DRAW_SCALE } from "@/shared/constants";
import { useStore } from "@/app";

import type { FixingPoint } from "../model/FixingPoint";
import type { Junction } from "../model/Junction";

type ZigzagFigureProps = {
    fixingPoint: FixingPoint;
    yOffset?: number;
};

const ZigzagFigure: FC<ZigzagFigureProps> = observer(({ fixingPoint, yOffset = 0 }) => {
    const { zigzagValue } = fixingPoint;

    if (zigzagValue === undefined) {
        return null;
    }

    const { startPos, endPos } = fixingPoint;

    const rawSign = Math.sign(startPos.y - endPos.y);
    const directionToPole: 1 | -1 = rawSign >= 0 ? 1 : -1;

    const type =
        zigzagValue > 0 ? "normal_from" :
            zigzagValue < 0 ? "normal_to" :
                "zero";

    const label = zigzagValue > 0 ? `+${zigzagValue}` : `${zigzagValue}`;

    return (
        <g transform={`translate(${endPos.x},${endPos.y + yOffset})`}>
            <ZigzagSymbol type={type} directionToPole={directionToPole} s={3} />
            <text
                x={8}
                y={directionToPole * 4}
                fontSize={6}
                textAnchor="start"
                fill="black"
            >
                {label}
            </text>
        </g>
    );
});


function getYOffset(fp: FixingPoint, junctions: Junction[]): number {
    for (const j of junctions) {
        const r = j.overlapXRange;

        if (fp.pole.x >= r.start && fp.pole.x <= r.end) {
            return (fp.zigzagValue ?? 0) * ZIGZAG_DRAW_SCALE;
        }
    }

    return 0;
}

export const ZigzagLayer = observer(() => {
    const { fixingPointsStore, junctionsStore } = useStore();

    return (
        <g className="zigzagLayer">
            {fixingPointsStore.list.map(fp => (
                <ZigzagFigure key={fp.id} fixingPoint={fp} yOffset={getYOffset(fp, junctionsStore.list)} />
            ))}
        </g>
    );
});
