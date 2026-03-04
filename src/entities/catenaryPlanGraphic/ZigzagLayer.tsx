import { observer } from "mobx-react-lite";

import { useStore } from "@/app/store";
import { ZIGZAG_DRAW_SCALE } from "@/shared/constants";
import type { Attachment } from "../lib/Attachment";
import type { Junction } from "../lib/Junction";
import { ZigzagFigure } from "./ZigzagFigure";

function getYOffset(att: Attachment, junctions: Junction[]): number {
    for (const j of junctions) {
        const r = j.overlapXRange;

        if (att.pole.x >= r.start && att.pole.x <= r.end) {
            return (att.zigzagValue ?? 0) * ZIGZAG_DRAW_SCALE;
        }
    }

    return 0;
}

export const ZigzagLayer = observer(() => {
    const { attachmentsStore, junctionsStore } = useStore();

    return (
        <g className="zigzagLayer">
            {attachmentsStore.list.map(a => (
                <ZigzagFigure key={a.id} attachment={a} yOffset={getYOffset(a, junctionsStore.list)} />
            ))}
        </g>
    );
});
