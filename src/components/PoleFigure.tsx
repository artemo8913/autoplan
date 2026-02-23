import type { FC } from "react";

import type { Pole } from "../lib/Pole";

const POLE_BASIC_RADIUS = 20;

interface PoleFigureProps {
    pole: Pole
}

export const PoleFigure: FC<PoleFigureProps> = (props) => {
    return <circle
        fill="none"
        cx={props.pole.pos.x}
        cy={props.pole.pos.y}
        stroke="black"
        strokeWidth="4"
        r={POLE_BASIC_RADIUS}
    />;
};