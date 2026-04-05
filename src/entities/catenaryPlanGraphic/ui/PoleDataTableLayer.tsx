import { observer } from "mobx-react-lite";

import { useStore } from "@/app";
import { formatOrdinateCompact } from "@/shared/lib/measure";

import type { CatenaryPole } from "../model/CatenaryPole";
import { useEffect, useState } from "react";

const ROW_HEIGHT = 12;
const FONT_SIZE = 5;
const TABLE_GAP = 30;
const LABEL_COL_WIDTH = 120;
const ROW_COUNT = 10;

const ROW_LABELS = [
    "Наименование опоры",
    "Ордината (км,пк,м)",
    "Марка кронштейна/надставки",
    "Марка консоли/жёсткой поперечины",
    "Марка стойки",
    "Марка фундамента",
    "Марка оттяжки",
    "Габарит опоры",
    "Элемент плана",
    "Элемент профиля",
];

function getCellValue(pole: CatenaryPole, rowIndex: number): string {
    switch (rowIndex) {
        case 0:
            return pole.name;
        case 1:
            return formatOrdinateCompact(pole.x);
        case 7:
            return String(pole.primaryGabarit);
        case 9:
            return "0";
        default:
            return "—";
    }
}

function splitPolesBySide(poles: CatenaryPole[]): { evenPoles: CatenaryPole[]; oddPoles: CatenaryPole[] } {
    const evenPoles: CatenaryPole[] = [];
    const oddPoles: CatenaryPole[] = [];

    for (const pole of poles) {
        const primaryTrack = Object.values(pole.tracks)[0]?.track;
        if (!primaryTrack) {
            continue;
        }

        if (primaryTrack.directionMultiplier === -1) {
            evenPoles.push(pole);
        } else {
            oddPoles.push(pole);
        }
    }

    evenPoles.sort((a, b) => a.x - b.x);
    oddPoles.sort((a, b) => a.x - b.x);

    return { evenPoles, oddPoles };
}

interface PoleDataTableProps {
    poles: CatenaryPole[];
    tableY: number;
    labelX: number;
}

function PoleDataTable({ poles, tableY, labelX }: PoleDataTableProps) {
    if (poles.length === 0) {
        return null;
    }

    const tableHeight = ROW_COUNT * ROW_HEIGHT;
    const firstPoleX = poles[0].x;
    const lastPoleX = poles[poles.length - 1].x;

    return (
        <g>
            {/* Горизонтальные разделители */}
            {Array.from({ length: ROW_COUNT + 1 }, (_, i) => (
                <line
                    key={`h-${i}`}
                    x1={labelX}
                    y1={tableY + i * ROW_HEIGHT}
                    x2={lastPoleX + 30}
                    y2={tableY + i * ROW_HEIGHT}
                    stroke="#999"
                    strokeWidth={0.5}
                />
            ))}

            {/* Вертикальные линии: левый край, правый край столбца названий */}
            <line x1={labelX} y1={tableY} x2={labelX} y2={tableY + tableHeight} stroke="#999" strokeWidth={0.5} />
            <line
                x1={firstPoleX - 5}
                y1={tableY}
                x2={firstPoleX - 5}
                y2={tableY + tableHeight}
                stroke="#999"
                strokeWidth={0.5}
            />

            {/* Названия строк */}
            {ROW_LABELS.map((label, i) => (
                <text
                    key={`label-${i}`}
                    x={labelX + 3}
                    y={tableY + i * ROW_HEIGHT + ROW_HEIGHT / 2}
                    fontSize={FONT_SIZE}
                    dominantBaseline="middle"
                    textAnchor="start"
                    fill="#333"
                >
                    {label}
                </text>
            ))}

            {/* Столбцы данны�� */}
            {poles.map((pole) => (
                <g key={pole.id}>
                    {Array.from({ length: ROW_COUNT }, (_, rowIdx) => (
                        <text
                            key={rowIdx}
                            x={pole.x}
                            y={tableY + rowIdx * ROW_HEIGHT + ROW_HEIGHT / 2}
                            fontSize={FONT_SIZE}
                            dominantBaseline="middle"
                            textAnchor="middle"
                            fill="#333"
                        >
                            {getCellValue(pole, rowIdx)}
                        </text>
                    ))}
                </g>
            ))}
        </g>
    );
}

interface PlanBBox {
    minY: number;
    maxY: number;
}

interface PoleDataTableLayerProps {
    planSVG: SVGGElement;
}

export const PoleDataTableLayer = observer(({ planSVG: planSVGRef }: PoleDataTableLayerProps) => {
    const { polesStore, tracksStore } = useStore();

    const [planBBox, setPlanBBox] = useState<PlanBBox | null>(null);

    useEffect(() => {
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const planSVGElement = entry.target as SVGGElement;
                const bbox = planSVGElement.getBBox();
                const newMinY = bbox.y;
                const newMaxY = bbox.y + bbox.height;
                setPlanBBox({ minY: newMinY, maxY: newMaxY });
            }
        });

        if (planSVGRef) {
            resizeObserver.observe(planSVGRef);
        }

        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    const { evenPoles, oddPoles } = splitPolesBySide(polesStore.list);

    const railwayStartX = tracksStore.railway.startX;
    const labelX = railwayStartX - LABEL_COL_WIDTH;

    if (planBBox === null) {
        return null;
    }

    const topTableY = planBBox.minY - TABLE_GAP - ROW_COUNT * ROW_HEIGHT;
    const bottomTableY = planBBox.maxY + TABLE_GAP;

    return (
        <g className="poleDataTableLayer">
            <PoleDataTable poles={evenPoles} tableY={topTableY} labelX={labelX} />
            <PoleDataTable poles={oddPoles} tableY={bottomTableY} labelX={labelX} />
        </g>
    );
});
