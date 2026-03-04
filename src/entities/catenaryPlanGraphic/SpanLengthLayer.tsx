import { observer } from "mobx-react-lite";

import { useStore } from "@/app/store";

import { SpanLengthLabel } from "./gost-symbols";

export const SpanLengthLayer = observer(() => {
    const { anchorSectionsStore } = useStore();

    return (
        <g className="spanLengthLayer">
            {anchorSectionsStore.list.flatMap(section =>
                section.attachments.slice(0, -1).map((att, i) => {
                    const nextAtt = section.attachments[i + 1];
                    const spanLength = Math.abs(nextAtt.pole.x - att.pole.x);
                    const midX = (att.pole.x + nextAtt.pole.x) / 2;
                    const trackY = att.endPos.y;
                    const directionToPole = Math.sign(att.startPos.y - trackY);
                    const offsetY = trackY + directionToPole * 10;

                    return (
                        <g key={`${att.id}-${nextAtt.id}`} transform={`translate(${midX}, ${offsetY})`}>
                            <SpanLengthLabel length={spanLength} s={5} />
                        </g>
                    );
                })
            )}
        </g>
    );
});
