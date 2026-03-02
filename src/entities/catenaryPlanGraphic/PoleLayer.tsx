import type { FC } from "react";


import type { Pole } from "../lib/Pole";
import { AnchorBraceSymbol, AnchorGuySymbol, PoleBase } from "./gost-symbols";

type PoleLayerProps = {
    poles: Pole[];
}

export const PoleLayer: FC<PoleLayerProps> = (props) => {
    return (
        <g className="poleLayer">
            {props.poles.map((pole) =>
                <g key={pole.id} transform={`translate(${pole.pos.x}, ${pole.pos.y})`}>
                    <PoleBase material={pole.material} size={pole.diameter} s={2} />
                    {pole.anchorGuy &&
                            <AnchorGuySymbol
                                poleSize={pole.diameter}
                                direction={pole.anchorGuy.direction}
                                length={pole.anchorGuy.length}
                                type={pole.anchorGuy.type}
                            />
                    }
                    {pole.anchorBrace &&
                        <AnchorBraceSymbol
                            direction={pole.anchorBrace.direction}
                            poleSize={pole.diameter}/>
                    }
                </g>
            )}
        </g>
    );
};