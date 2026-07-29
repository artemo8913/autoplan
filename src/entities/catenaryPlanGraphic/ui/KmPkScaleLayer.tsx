import { observer } from "mobx-react-lite";

import { kmPkMToMeters, metersToKmPkM } from "@/shared/lib/measure";
import { picketCountForKm } from "@/shared/lib/picketageOps";
import { useStore } from "@/app";

export const KmPkScaleLayer = observer(() => {
    const { tracksStore, displaySettingsStore } = useStore();
    const { startX, endX, picketage } = tracksStore.railway;

    const kmTickH = displaySettingsStore.kmTickHeight;
    const pkTickH = displaySettingsStore.pkTickHeight;
    const fontSize = displaySettingsStore.scaleLabelFontSize;

    // Тики строим по логической сетке км/пк, а физическую X берём через пикетаж —
    // тогда на рубленых км отметки встают на фактические границы, а не на кратные 100 м.
    const kmTicks: { x: number; km: number }[] = [];
    const pkTicks: { x: number; pk: number }[] = [];

    const startKm = metersToKmPkM(startX, picketage).km;
    const endKm = metersToKmPkM(endX, picketage).km;

    for (let km = startKm; km <= endKm; km++) {
        const count = picketCountForKm(picketage, km);
        for (let pk = 0; pk < count; pk++) {
            const x = kmPkMToMeters(km, pk, 0, picketage);
            if (x < startX || x > endX) {
                continue;
            }
            if (pk === 0) {
                kmTicks.push({ x, km });
            } else {
                pkTicks.push({ x, pk });
            }
        }
    }

    return (
        <g className="kmPkScaleLayer">
            {/* Пикетные отметки */}
            {pkTicks.map(({ x, pk }) => (
                <g key={`pk-${x}`}>
                    <line x1={x} y1={-pkTickH} x2={x} y2={pkTickH} stroke="#999" strokeWidth={0.5} />
                    <text x={x} y={-pkTickH - 2} fontSize={fontSize * 0.8} textAnchor="middle" fill="#999">
                        {pk}
                    </text>
                </g>
            ))}
            {/* Километровые отметки */}
            {kmTicks.map(({ x, km }) => (
                <g key={`km-${x}`}>
                    <line x1={x} y1={-kmTickH} x2={x} y2={kmTickH} stroke="#333" strokeWidth={1} />
                    <text
                        x={x}
                        y={-kmTickH - 4}
                        fontSize={fontSize}
                        textAnchor="middle"
                        fill="#333"
                        fontWeight="bold"
                    >
                        КМ {km}
                    </text>
                </g>
            ))}
        </g>
    );
});

KmPkScaleLayer.displayName = "KmPkScaleLayer";
