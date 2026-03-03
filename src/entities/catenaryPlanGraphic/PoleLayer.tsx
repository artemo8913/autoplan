import { memo } from "react";
import { observer } from "mobx-react-lite";

import type { Pole } from "../lib/Pole";
import { AnchorBraceSymbol, AnchorGuySymbol, PoleBase } from "./gost-symbols";

interface PoleFigureSvgProps {
    pole: Pole;
    isSelected: boolean;
    onPoleClick: () => void;
}

const PoleFigureSvg = memo(observer(({ pole, isSelected, onPoleClick }: PoleFigureSvgProps) => {
    const { x, y } = pole.pos;
    const color = isSelected ? "blue" : "black";
    const sw = isSelected ? 3 : 2;

    return (
        <g
            transform={`translate(${x}, ${y})`}
            onClick={onPoleClick}
            className="pole-clickable"
        >
            <PoleBase material={pole.material} size={pole.diameter} s={sw} color={color} />
            {pole.anchorGuy && (
                <AnchorGuySymbol
                    poleSize={pole.diameter}
                    direction={pole.anchorGuy.direction}
                    length={pole.anchorGuy.length}
                    type={pole.anchorGuy.type}
                    color={color}
                />
            )}
            {pole.anchorBrace && (
                <AnchorBraceSymbol
                    direction={pole.anchorBrace.direction}
                    poleSize={pole.diameter}
                    color={color}
                />
            )}
        </g>
    );
}));

type PoleLayerProps = {
    poles: Pole[];
    selectedPoleId?: string | null;
    onPoleClick?: (id: string) => void;
}

export const PoleLayer = observer(({ poles, selectedPoleId, onPoleClick }: PoleLayerProps) => {
    return (
        <g className="poleLayer">
            {poles.map((pole) => (
                <PoleFigureSvg
                    key={pole.id}
                    pole={pole}
                    isSelected={pole.id === selectedPoleId}
                    onPoleClick={() => onPoleClick?.(pole.id)}
                />
            ))}
        </g>
    );
});
