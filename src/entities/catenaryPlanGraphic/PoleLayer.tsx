import { memo } from "react";
import { observer } from "mobx-react-lite";

import type { Pole } from "../lib/Pole";
import { useStore } from "@/app/store";
import { AnchorBraceSymbol, AnchorGuySymbol, PoleBase, PoleNumberLabel } from "./gost-symbols";

interface PoleFigureSvgProps {
    pole: Pole;
}

function PoleFigureSvgBase({ pole }: PoleFigureSvgProps) {
    const { uiStore, junctionsStore } = useStore();
    const isSelected = pole.id === uiStore.selectedPoleId;
    const isInsulatingAnchor = junctionsStore.insulatingJunctionAnchorPoleIds.has(pole.id);
    const color = isSelected || isInsulatingAnchor ? "blue" : "black";
    const sw = isSelected ? 3 : 2;

    const primaryTrack = Object.values(pole.tracks)[0]?.track;
    const labelDirection = primaryTrack?.directionMultiplier ?? -1;

    const { x, y } = pole.pos;

    return (
        <g
            transform={`translate(${x}, ${y})`}
            onClick={() => uiStore.selectPole(pole.id)}
            className="pole-clickable"
        >
            <PoleBase material={pole.material} size={pole.radius} s={sw} color={color} filled={isInsulatingAnchor} />
            {pole.anchorGuy && (
                <AnchorGuySymbol
                    poleSize={pole.radius}
                    direction={pole.anchorGuy.direction}
                    length={pole.anchorGuy.length}
                    type={pole.anchorGuy.type}
                    color={color}
                />
            )}
            {pole.anchorBrace && (
                <AnchorBraceSymbol
                    direction={pole.anchorBrace.direction}
                    poleSize={pole.radius}
                    color={color}
                />
            )}
            <g transform={`translate(0, ${labelDirection * 40})`}>
                <PoleNumberLabel number={pole.name} grounding={pole.grounding} s={5} color={color} />
            </g>
        </g>
    );
}

const PoleFigureSvg = memo(observer(PoleFigureSvgBase));

export const PoleLayer = observer(() => {
    const { polesStore } = useStore();
    return (
        <g className="poleLayer">
            {polesStore.list.map((pole) => (
                <PoleFigureSvg key={pole.id} pole={pole} />
            ))}
        </g>
    );
});
