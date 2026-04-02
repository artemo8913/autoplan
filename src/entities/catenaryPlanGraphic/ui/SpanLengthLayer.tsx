import { observer } from "mobx-react-lite";

import { SpanLengthLabel } from "@/shared/ui/gost-symbols";
import { useStore } from "@/app";

export const SpanLengthLayer = observer(() => {
    const { anchorSectionsStore, displaySettingsStore } = useStore();

    // Дедуплицируем метки по паре опор (одна и та же пара опор встречается в двух АУ в зоне сопряжения)
    const seen = new Set<string>();
    const labels: Array<{ key: string; spanLength: number; midX: number; offsetY: number }> = [];

    for (const section of anchorSectionsStore.list) {
        const fps = section.fixingPoints;
        for (let i = 0; i < fps.length - 1; i++) {
            const fp = fps[i];
            const nextFp = fps[i + 1];
            const dedupeKey = `${fp.pole.id}_${nextFp.pole.id}`;
            if (seen.has(dedupeKey)) {
                continue;
            }
            seen.add(dedupeKey);

            const spanLength = Math.abs(nextFp.pole.x - fp.pole.x);
            const midX = (fp.pole.x + nextFp.pole.x) / 2;
            const trackY = fp.endPos.y;
            const startPos = fp.startPos;
            const directionToPole = startPos ? Math.sign(startPos.y - trackY) : -1;
            const offsetY = trackY + directionToPole * displaySettingsStore.spanLabelYOffset;

            labels.push({ key: `${fp.id}-${nextFp.id}`, spanLength, midX, offsetY });
        }
    }

    return (
        <g className="spanLengthLayer">
            {labels.map(({ key, spanLength, midX, offsetY }) => (
                <g className="svg-clickable" key={key} transform={`translate(${midX}, ${offsetY})`}>
                    <SpanLengthLabel length={spanLength} s={displaySettingsStore.spanLabelSize} />
                </g>
            ))}
        </g>
    );
});
