import { observer } from "mobx-react-lite";

import { SpanLengthLabel } from "@/shared/ui/gost-symbols";
import { useStore } from "@/app";

export const SpanLengthLayer = observer(() => {
    const { anchorSectionsStore } = useStore();

    return (
        <g className="spanLengthLayer">
            {anchorSectionsStore.list.flatMap((section) =>
                section.fixingPoints.slice(0, -1).map((fp, i) => {
                    const nextFp = section.fixingPoints[i + 1];
                    const spanLength = Math.abs(nextFp.pole.x - fp.pole.x);
                    const midX = (fp.pole.x + nextFp.pole.x) / 2;
                    const trackY = fp.endPos.y;
                    const startPos = fp.startPos;
                    const directionToPole = startPos ? Math.sign(startPos.y - trackY) : -1;
                    const offsetY = trackY + directionToPole * 10;

                    return (
                        <g
                            className="svg-clickable"
                            key={`${fp.id}-${nextFp.id}`}
                            transform={`translate(${midX}, ${offsetY})`}
                        >
                            <SpanLengthLabel length={spanLength} s={5} />
                        </g>
                    );
                }),
            )}
        </g>
    );
});
