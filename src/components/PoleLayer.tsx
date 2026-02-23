import type { FC } from "react";


import { PoleFigure } from "./PoleFigure";
import type { Pole } from "../lib/Pole";

type PoleLayerProps = {
    poles: Pole[]
}

export const PoleLayer: FC<PoleLayerProps> = (props) => {
    return (
        <g className="poleLayer">
            {props.poles.map((pole) => <PoleFigure key={pole.id} pole={pole} />)}
        </g>
    );
};