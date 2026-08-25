import { useMemo } from "react";
import { comparer, computed } from "mobx";
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
const TABLE_HEIGHT = ROW_COUNT * ROW_HEIGHT;

/**
 * Шаг огрубления границ плана по Y (SVG-единиц).
 * Точная оценка min/max Y перерисовывала бы обе таблицы на каждый сдвиг любой опоры;
 * квантование оставляет таблицу на месте, пока габариты не изменились ощутимо.
 */
const BOUNDS_QUANT_STEP = 20;

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

interface PoleColumnProps {
    poleId: string;
}

/** Столбец одной опоры. memo по id: сдвиг соседней опоры его не трогает. */
function PoleColumnBase({ poleId }: PoleColumnProps) {
    const { catenaryPoleStore, tracksStore } = useStore();

    const pole = catenaryPoleStore.poles.get(poleId);
    if (!pole) {
        return null;
    }

    const picketage = tracksStore.railway.picketage;

    return (
        <g>
            {Array.from({ length: ROW_COUNT }, (_, rowIdx) => (
                <text
                    key={rowIdx}
                    x={pole.x}
                    y={rowIdx * ROW_HEIGHT + ROW_HEIGHT / 2}
                    fontSize={FONT_SIZE}
                    dominantBaseline="middle"
                    textAnchor="middle"
                    fill="#333"
                >
                    {getCellValue(pole, rowIdx, picketage)}
                </text>
            ))}
        </g>
    );
}

// observer сам оборачивает компонент в React.memo — отдельный memo не нужен.
const PoleColumn = observer(PoleColumnBase);

interface TableGridProps {
    firstPoleId: string;
    lastPoleId: string;
    labelX: number;
}

/** Разлиновка таблицы: зависит только от крайних опор. */
function TableGridBase({ firstPoleId, lastPoleId, labelX }: TableGridProps) {
    const { catenaryPoleStore } = useStore();

    const firstPoleX = catenaryPoleStore.poles.get(firstPoleId)?.x;
    const lastPoleX = catenaryPoleStore.poles.get(lastPoleId)?.x;

    if (firstPoleX === undefined || lastPoleX === undefined) {
        return null;
    }

    return (
        <g>
            {/* Горизонтальные разделители */}
            {Array.from({ length: ROW_COUNT + 1 }, (_, i) => (
                <line
                    key={`h-${i}`}
                    x1={labelX}
                    y1={i * ROW_HEIGHT}
                    x2={lastPoleX + 30}
                    y2={i * ROW_HEIGHT}
                    stroke="#999"
                    strokeWidth={0.5}
                />
            ))}

            {/* Вертикальные линии: левый край, правый край столбца названий */}
            <line x1={labelX} y1={0} x2={labelX} y2={TABLE_HEIGHT} stroke="#999" strokeWidth={0.5} />
            <line x1={firstPoleX - 5} y1={0} x2={firstPoleX - 5} y2={TABLE_HEIGHT} stroke="#999" strokeWidth={0.5} />
        </g>
    );
}

const TableGrid = observer(TableGridBase);

interface PoleDataTableProps {
    poleIds: string[];
    tableY: number;
    labelX: number;
}

function PoleDataTable({ poleIds, tableY, labelX }: PoleDataTableProps) {
    if (poleIds.length === 0) {
        return null;
    }

    // Таблица целиком сдвигается трансформом — столбцы не зависят от tableY
    // и не перерисовываются, когда границы плана поехали.
    return (
        <g transform={`translate(0, ${tableY})`}>
            <TableGrid firstPoleId={poleIds[0]} lastPoleId={poleIds[poleIds.length - 1]} labelX={labelX} />

            {/* Названия строк */}
            {ROW_LABELS.map((label, i) => (
                <text
                    key={`label-${i}`}
                    x={labelX + 3}
                    y={i * ROW_HEIGHT + ROW_HEIGHT / 2}
                    fontSize={FONT_SIZE}
                    dominantBaseline="middle"
                    textAnchor="start"
                    fill="#333"
                >
                    {label}
                </text>
            ))}

            {poleIds.map((id) => (
                <PoleColumn key={id} poleId={id} />
            ))}
        </g>
    );
}

function PoleDataTableLayerBase() {
    const { catenaryPoleStore, vlPolesStore, tracksStore, displaySettingsStore } = useStore();

    // Оба computed сравниваются структурно: пока квантованные границы и порядок опор
    // не изменились, слой не перерисовывается — обновляется только столбец сдвинутой опоры.
    const boundsComputed = useMemo(
        () =>
            computed(
                () => {
                    let minY = Infinity;
                    let maxY = -Infinity;

                    for (const pole of catenaryPoleStore.list) {
                        const { y } = pole.pos;
                        minY = Math.min(minY, y);
                        maxY = Math.max(maxY, y);
                    }

                    // ВЛ-опоры зачастую выше/ниже КС-опор — учитываем их габариты,
                    // чтобы таблицы не перекрывали символы ВЛ-опор.
                    const vlSize = displaySettingsStore.vlPoleDefaultSize;
                    for (const vlPole of vlPolesStore.list) {
                        const { y } = vlPole.pos;
                        minY = Math.min(minY, y - vlSize);
                        maxY = Math.max(maxY, y + vlSize);
                    }

                    if (minY === Infinity) {
                        return { minY: 0, maxY: 0 };
                    }

                    return {
                        minY: Math.floor(minY / BOUNDS_QUANT_STEP) * BOUNDS_QUANT_STEP,
                        maxY: Math.ceil(maxY / BOUNDS_QUANT_STEP) * BOUNDS_QUANT_STEP,
                    };
                },
                { equals: comparer.structural },
            ),
        [catenaryPoleStore, vlPolesStore, displaySettingsStore],
    );

    const columnsComputed = useMemo(
        () =>
            computed(
                () => {
                    const even: CatenaryPole[] = [];
                    const odd: CatenaryPole[] = [];

                    for (const pole of catenaryPoleStore.list) {
                        const primaryTrack = pole.primaryTrack;
                        if (!primaryTrack) {
                            continue;
                        }
                        (primaryTrack.directionMultiplier === -1 ? even : odd).push(pole);
                    }

                    const byX = (a: CatenaryPole, b: CatenaryPole) => a.x - b.x;

                    return {
                        evenIds: even.sort(byX).map((p) => p.id),
                        oddIds: odd.sort(byX).map((p) => p.id),
                    };
                },
                { equals: comparer.structural },
            ),
        [catenaryPoleStore],
    );

    const { minY, maxY } = boundsComputed.get();
    const { evenIds, oddIds } = columnsComputed.get();

    if (evenIds.length === 0 && oddIds.length === 0) {
        return null;
    }

    const railway = tracksStore.railway;
    const labelX = railway.startX - LABEL_COL_WIDTH;
    const gap = displaySettingsStore.poleLabelYOffset + TABLE_GAP;

    return (
        <g className="poleDataTableLayer">
            <PoleDataTable poleIds={evenIds} tableY={minY - gap - TABLE_HEIGHT} labelX={labelX} />
            <PoleDataTable poleIds={oddIds} tableY={maxY + gap} labelX={labelX} />
        </g>
    );
}

export const PoleDataTableLayer = observer(PoleDataTableLayerBase);
