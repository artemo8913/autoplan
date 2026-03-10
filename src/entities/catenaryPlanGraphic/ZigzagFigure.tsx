import type { FC } from "react";
import { observer } from "mobx-react-lite";

import type { FixingPoint } from "../lib/FixingPoint";
import { ZigzagSymbol } from "./gost-symbols";

type ZigzagFigureProps = {
    fixingPoint: FixingPoint;
    yOffset?: number;
};

export const ZigzagFigure: FC<ZigzagFigureProps> = observer(({ fixingPoint, yOffset = 0 }) => {
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
