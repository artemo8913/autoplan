import { observer } from "mobx-react-lite";

import { useStore } from "@/app";
import { xToKmPkM } from "@/shared/lib/measure";

function generateTicks(startX: number, endX: number, step: number): number[] {
    const first = Math.ceil(startX / step) * step;
    const ticks: number[] = [];
    for (let x = first; x <= endX; x += step) {
        ticks.push(x);
    }
    return ticks;
}

export const KmPkScaleLayer = observer(() => {
    const { tracksStore, displaySettingsStore } = useStore();
    const { startX, endX } = tracksStore.railway;

    const kmTickH = displaySettingsStore.kmTickHeight;
    const pkTickH = displaySettingsStore.pkTickHeight;
    const fontSize = displaySettingsStore.scaleLabelFontSize;

    const kmTicks = generateTicks(startX, endX, 1000);
    const pkTicks = generateTicks(startX, endX, 100).filter((x) => x % 1000 !== 0);

    return (
        <g className="kmPkScaleLayer">
            {/* Пикетные отметки */}
            {pkTicks.map((x) => {
                const { pk } = xToKmPkM(x);
                return (
                    <g key={`pk-${x}`}>
                        <line x1={x} y1={-pkTickH} x2={x} y2={pkTickH} stroke="#999" strokeWidth={0.5} />
                        <text
                            x={x}
                            y={-pkTickH - 2}
                            fontSize={fontSize * 0.8}
                            textAnchor="middle"
                            fill="#999"
                        >
                            {pk}
                        </text>
                    </g>
                );
            })}
            {/* Километровые отметки */}
            {kmTicks.map((x) => {
                const { km } = xToKmPkM(x);
                return (
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
                );
            })}
        </g>
    );
});

KmPkScaleLayer.displayName = "KmPkScaleLayer";
