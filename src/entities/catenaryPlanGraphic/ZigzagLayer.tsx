import { observer } from "mobx-react-lite";

import { useStore } from "@/app/store";
import { ZIGZAG_DRAW_SCALE } from "@/shared/constants";
import type { FixingPoint } from "../lib/FixingPoint";
import type { Junction } from "../lib/Junction";
import { ZigzagFigure } from "./ZigzagFigure";

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
