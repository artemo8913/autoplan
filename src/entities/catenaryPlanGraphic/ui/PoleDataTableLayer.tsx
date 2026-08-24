import { observer } from "mobx-react-lite";

import { useStore } from "@/app";
import { formatOrdinateCompact } from "@/shared/lib/measure";
import type { Picketage } from "@/shared/types/catenaryTypes";

import type { CatenaryPole } from "../model/CatenaryPole";

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

function getCellValue(pole: CatenaryPole, rowIndex: number, picketage: Picketage): string {
    switch (rowIndex) {
        case 0:
            return pole.name;
        case 1:
            return formatOrdinateCompact(pole.x, picketage);
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
        const primaryTrack = pole.primaryTrack;
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
    picketage: Picketage;
}

function PoleDataTable({ poles, tableY, labelX, picketage }: PoleDataTableProps) {
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
                            {getCellValue(pole, rowIdx, picketage)}
                        </text>
                    ))}
                </g>
            ))}
        </g>
    );
}

export const PoleDataTableLayer = observer(() => {
    const { catenaryPoleStore, vlPolesStore, tracksStore, displaySettingsStore } = useStore();

    const poles = catenaryPoleStore.list;
    if (poles.length === 0) {
        return null;
    }

    let minPoleY = Infinity;
    let maxPoleY = -Infinity;
    for (const pole of poles) {
        const { y } = pole.pos;
        if (y < minPoleY) {
            minPoleY = y;
        }
        if (y > maxPoleY) {
            maxPoleY = y;
        }
    }

    // ВЛ-опоры зачастую выше/ниже КС-опор — учитываем их габариты,
    // чтобы таблицы не перекрывали символы ВЛ-опор.
    const vlSize = displaySettingsStore.vlPoleDefaultSize;
    for (const vlPole of vlPolesStore.list) {
        const { y } = vlPole.pos;
        if (y - vlSize < minPoleY) {
            minPoleY = y - vlSize;
        }
        if (y + vlSize > maxPoleY) {
            maxPoleY = y + vlSize;
        }
    }

    const { evenPoles, oddPoles } = splitPolesBySide(poles);

    const railway = tracksStore.railway;
    const labelX = railway.startX - LABEL_COL_WIDTH;

    const gap = displaySettingsStore.poleLabelYOffset + TABLE_GAP;
    const topTableY = minPoleY - gap - ROW_COUNT * ROW_HEIGHT;
    const bottomTableY = maxPoleY + gap;

    return (
        <g className="poleDataTableLayer">
            <PoleDataTable poles={evenPoles} tableY={topTableY} labelX={labelX} picketage={railway.picketage} />
            <PoleDataTable poles={oddPoles} tableY={bottomTableY} labelX={labelX} picketage={railway.picketage} />
        </g>
    );
});
