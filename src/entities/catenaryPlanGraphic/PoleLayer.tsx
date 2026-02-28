import type { FC } from "react";


import type { Pole } from "../lib/Pole";
import { PoleBase } from "./gost-symbols";

type PoleLayerProps = {
    poles: Pole[];
}

export const PoleLayer: FC<PoleLayerProps> = (props) => {
    return (
        <g className="poleLayer">
            {props.poles.map((pole) =>
                <g key={pole.id} transform={`translate(${pole.pos.x}, ${pole.pos.y})`}>
                    <PoleBase material={pole.material} size={pole.diameter} s={2} />
                </g>
            )}
        </g>
    );
};