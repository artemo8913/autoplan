import { observer } from "mobx-react-lite";

import { buildScaleTicks } from "@/shared/lib/picketageOps";
import { useStore } from "@/app";

/** Цвет отметки рубленого км — чтобы «шкала не сходится с линейкой» читалось как заданное, а не как баг. */
const NON_STANDARD_KM_COLOR = "#1971c2";

export const KmPkScaleLayer = observer(() => {
    const { tracksStore, displaySettingsStore } = useStore();
    const { startX, endX, picketage } = tracksStore.railway;

    const kmTickH = displaySettingsStore.kmTickHeight;
    const pkTickH = displaySettingsStore.pkTickHeight;
    const fontSize = displaySettingsStore.scaleLabelFontSize;

    // Тики строим по логической сетке км/пк, а физическую X берём через пикетаж —
    // тогда на рубленых км отметки встают на фактические границы, а не на кратные 100 м.
    const { kmTicks, pkTicks } = buildScaleTicks(startX, endX, picketage);

    return (
        <g className="kmPkScaleLayer">
            {/* Пикетные отметки */}
            {pkTicks.map(({ x, km, pk }) => (
                <g key={`pk-${km}-${pk}`}>
                    <line x1={x} y1={-pkTickH} x2={x} y2={pkTickH} stroke="#999" strokeWidth={0.5} />
                    <text x={x} y={-pkTickH - 2} fontSize={fontSize * 0.8} textAnchor="middle" fill="#999">
                        {pk}
                    </text>
                </g>
            ))}
            {/* Километровые отметки */}
            {kmTicks.map(({ x, km, lengthM, isNonStandard }) => (
                <g key={`km-${km}`}>
                    <line
                        x1={x}
                        y1={-kmTickH}
                        x2={x}
                        y2={kmTickH}
                        stroke={isNonStandard ? NON_STANDARD_KM_COLOR : "#333"}
                        strokeWidth={1}
                    />
                    <text
                        x={x}
                        y={-kmTickH - 4}
                        fontSize={fontSize}
                        textAnchor="middle"
                        fill={isNonStandard ? NON_STANDARD_KM_COLOR : "#333"}
                        fontWeight="bold"
                    >
                        {isNonStandard ? `КМ ${km} · ${lengthM} м` : `КМ ${km}`}
                    </text>
                </g>
            ))}
        </g>
    );
});

KmPkScaleLayer.displayName = "KmPkScaleLayer";
