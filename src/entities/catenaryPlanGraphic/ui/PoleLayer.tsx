import { memo } from "react";
import { observer } from "mobx-react-lite";

import { AnchorBraceSymbol, AnchorGuySymbol, PoleBase, PoleNumberLabel } from "@/shared/ui/gost-symbols";
import { useStore } from "@/app";

import type { CatenaryPole } from "../model/CatenaryPole";

interface PoleFigureSvgProps {
    pole: CatenaryPole;
}

function PoleFigureSvgBase({ pole }: PoleFigureSvgProps) {
    const { junctionsStore, selectionStore } = useStore();
    const isInsulatingAnchor = junctionsStore.insulatingJunctionAnchorPoleIds.has(pole.id);
    const isSelected = selectionStore.isSelected(pole.id);
    const color = isInsulatingAnchor ? "blue" : "black";

    const primaryTrack = Object.values(pole.tracks)[0]?.track;
    const labelDirection = primaryTrack?.directionMultiplier ?? -1;

    const { x, y } = pole.pos;

    const cls = ["svg-clickable", isSelected ? "pole--selected" : ""].filter(Boolean).join(" ");

    return (
        <g transform={`translate(${x}, ${y})`} className={cls}>
            <PoleBase material={pole.material} size={pole.radius} s={2} color={color} filled={isInsulatingAnchor} />
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
                <AnchorBraceSymbol direction={pole.anchorBrace.direction} poleSize={pole.radius} color={color} />
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
