import type { FC } from "react";

import type { Pole } from "../lib/Pole";
import { PoleBase } from "./gost-symbols";

interface PoleFigureProps {
    pole: Pole;
}

export const PoleFigure: FC<PoleFigureProps> = ({ pole }) => {
    const { x, y } = pole.pos;
    return (
        <g transform={`translate(${x}, ${y})`}>
            <PoleBase material={pole.material} size={pole.diameter} s={2} />
        </g>
    );
};