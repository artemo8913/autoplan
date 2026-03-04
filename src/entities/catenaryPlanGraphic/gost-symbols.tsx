/**
 * SVG-компоненты условных графических обозначений
 * для планов контактной сети по Порядку ОАО «РЖД» 2023 г.
 *
 * Все компоненты рендерятся в локальных координатах (0,0 = центр символа).
 * Родительский компонент оборачивает в <g transform="translate(x,y)">
 *
 * Параметр `s` — базовый размер (аналог толщины S из документа).
 * По умолчанию s = 2.
 *
 * ВАЖНО: Направления в SVG:
 *   ось X — вдоль пути (горизонтально, км растут вправо)
 *   ось Y — поперёк пути (вниз = к нечётным путям)
 */

import type { FC } from "react";

// =============================================================
// ТИПЫ
// =============================================================

/** Направление: +1 вниз (к пути снизу), -1 вверх (к пути сверху) */
type DirectionSign = 1 | -1;

/** Общие пропсы для символов */
interface SymbolProps {
    /** Базовая толщина линий (S). Большинство элементов S/2. */
    s?: number;
    /** Цвет (чёрный по умолчанию, синий для ИС) */
    color?: string;
}

// =============================================================
// 1. ОПОРЫ — базовые символы (Рис. 13а, 15а)
// =============================================================

interface PoleBaseProps extends SymbolProps {
    /** ж/б = окружность, металл = квадрат */
    material: "concrete" | "metal";
    /** Радиус окружности / полуширина квадрата */
    size?: number;
    /** Если true — форма залита цветом (для ИС анкерных опор) */
    filled?: boolean;
}

/**
 * Базовый символ опоры.
 * Ж/Б — окружность (Рис. 13а).
 * Металл — квадрат (Рис. 15а).
 */
export const PoleBase: FC<PoleBaseProps> = ({
    material,
    size = 8,
    s = 2,
    color = "black",
    filled = false,
}) => {
    const sw = s / 2;
    const fill = filled ? color : "transparent";
    if (material === "metal") {
        return (
            <rect
                x={-size} y={-size}
                width={size * 2} height={size * 2}
                fill={fill} stroke={color} strokeWidth={sw}
            />
        );
    }
    return (
        <circle
            cx={0} cy={0} r={size}
            fill={fill} stroke={color} strokeWidth={sw}
        />
    );
};

// =============================================================
// 2. КОНСОЛЬ — линия от опоры к пути (Рис. 13б, 15б)
// =============================================================

interface ConsoleProps extends SymbolProps {
    /** Длина консоли в SVG-единицах (знак = направление: + вниз, - вверх) */
    length: number;
    /** Радиус/полуширина символа опоры (начало — от края опоры) */
    poleSize?: number;
}

/**
 * Однопутная консоль (Рис. 13б, 15б).
 * Просто вертикальная линия от края опоры к оси пути.
 * Перпендикулярной черты на конце НЕТ — то, что видно на рисунке, это сам путь.
 */
export const ConsoleSymbol: FC<ConsoleProps> = ({
    length,
    poleSize = 8,
    s = 2,
    color = "black",
}) => {
    const sw = s / 2;
    const sign = Math.sign(length) || 1;
    const startY = sign * poleSize;
    const endY = length;

    return (
        <line
            x1={0} y1={startY}
            x2={0} y2={endY}
            stroke={color} strokeWidth={sw}
        />
    );
};

/**
 * Двухпутная консоль (Рис. 15и).
 * Длинная черта, перекрывающая два пути.
 */
export const DualConsoleSymbol: FC<{
    lengthUp: number;
    lengthDown: number;
    poleSize?: number;
    s?: number;
    color?: string;
}> = ({ lengthUp, lengthDown, poleSize = 8, s = 2, color = "black" }) => (
    <g className="dual-console">
        <ConsoleSymbol length={-Math.abs(lengthUp)} poleSize={poleSize} s={s} color={color} />
        <ConsoleSymbol length={Math.abs(lengthDown)} poleSize={poleSize} s={s} color={color} />
    </g>
);

// =============================================================
// 3. ФИКСАТОР — полуокружность (Рис. 13д,е, 15ж,з)
// =============================================================

interface FixatorProps extends SymbolProps {
    /** Прямой: полуокружность в сторону опоры. Обратный: от опоры. */
    type: "straight" | "reverse";
    /** Направление консоли к пути: 1 = вниз, -1 = вверх */
    direction: DirectionSign;
    /** Радиус полуокружности */
    radius?: number;
}

/**
 * Фиксатор на конце консоли (Рис. 13д,е, 15ж,з).
 * Полуокружность: прямой — в сторону опоры, обратный — от опоры.
 * Рисуется в точке (0,0) = конец консоли (ось пути).
 */
export const FixatorSymbol: FC<FixatorProps> = ({
    type,
    direction,
    radius = 4,
    s = 2,
    color = "black",
}) => {
    const sw = s / 2;
    // Прямой фиксатор: полуокружность раскрыта к пути (от опоры),
    // выпуклость в сторону опоры (против direction)
    // Обратный: наоборот
    const bulgeDir = type === "straight" ? -direction : direction;

    // Полуокружность: от (-r, 0) до (r, 0), выпуклость по Y
    const sweepFlag = bulgeDir > 0 ? 1 : 0;

    return (
        <path
            d={`M ${-radius},0 A ${radius},${radius} 0 0,${sweepFlag} ${radius},0`}
            fill="none" stroke={color} strokeWidth={sw}
        />
    );
};

// =============================================================
// 4. ОТТЯЖКА анкерной опоры (Рис. 13в,г, 15д,е)
// =============================================================

interface AnchorGuyProps extends SymbolProps {
    /** Длина оттяжки в SVG-единицах вдоль оси X */
    length?: number;
    /** 1 = вправо, -1 = влево */
    direction?: DirectionSign;
    /** Одинарная: 1 линия + 1 треугольник. Двойная: 2 линии + 1 треугольник. */
    type: "single" | "double" | "inside";
    /** Размер символа опоры (чтобы начать от края) */
    poleSize?: number;
}

/**
 * Оттяжка анкерной опоры (Рис. 13в,г, 15д,е).
 * Одинарная: одна линия + один незакрашенный треугольник на конце.
 * Двойная: ДВЕ линии + ОДИН незакрашенный треугольник на конце.
 */
export const AnchorGuySymbol: FC<AnchorGuyProps> = ({
    length = 30,
    direction = -1,
    type,
    poleSize = 8,
    s = 2,
    color = "black",
}) => {
    const sw = s / 2;
    const triRotateDeg = direction === -1 ? 180 : 0;
    const startX = poleSize;
    const endX = length;
    const triH = 16;
    const triW = 12;

    // Треугольник (незакрашенный) на конце
    const triangle = (
        <polygon
            points={`${endX},0 ${endX + triH},${-triW} ${endX + triH},${triW}`}
            fill="none" stroke={color} strokeWidth={sw}
        />
    );

    if (type === "single") {
        return (
            <g className="guy-wire-single" transform={`rotate(${triRotateDeg})`}>
                <line x1={startX} y1={0} x2={endX} y2={0}
                    stroke={color} strokeWidth={sw} />
                {triangle}
            </g>
        );
    }

    // Двойная: две параллельные линии от одного треугольника в сторону опоры. 
    const yOffset = 4;
    const xOffset = 5;

    return (
        <g className="guy-wire-double" transform={`rotate(${triRotateDeg})`}>
            <line x1={startX} y1={-yOffset} x2={endX + xOffset} y2={-yOffset}
                stroke={color} strokeWidth={sw} />
            <line x1={startX} y1={yOffset} x2={endX + xOffset} y2={yOffset}
                stroke={color} strokeWidth={sw} />
            {triangle}
        </g>
    );
};

// =============================================================
// 5. Металлическая анкерная с подкосом (Рис. 15в)
// =============================================================

interface AnchorBraceProps extends SymbolProps {
    /** Размер квадрата опоры */
    poleSize?: number;
    /** 1 = вправо, -1 = влево */
    direction?: DirectionSign;
}

/**
 * Треугольник внутри квадрата — анкерная с подкосом (Рис. 15в).
 * Рисуется поверх PoleBase(metal). Незакрашенный треугольник.
 */
export const AnchorBraceSymbol: FC<AnchorBraceProps> = ({
    poleSize = 8,
    s = 2,
    color = "black",
    direction = -1
}) => {
    const sw = s / 2;
    const d = poleSize * 0.6;
    const triRotateDeg = direction === -1 ? 180 : 0;


    return (
        <polygon
            transform={`rotate(${triRotateDeg})`}
            points={`${d},0 ${-d},${-d} ${-d},${d}`}
            fill="none" stroke={color} strokeWidth={sw}
        />
    );
};

// =============================================================
// 6. Металлическая анкерная без подкоса, увеличенная база (Рис. 15г)
// =============================================================

interface AnchorLargeBaseProps extends SymbolProps {
    /** Полуширина прямоугольника (по X, вдоль пути) */
    halfWidth?: number;
    /** Полувысота прямоугольника (по Y, поперёк) */
    halfHeight?: number;
}

/**
 * Прямоугольник + крест по диагоналям (Рис. 15г).
 * Анкерная без подкоса с увеличенной базой.
 */
export const AnchorLargeBaseSymbol: FC<AnchorLargeBaseProps> = ({
    halfWidth = 12,
    halfHeight = 8,
    s = 2,
    color = "black",
}) => {
    const sw = s / 2;
    return (
        <g className="anchor-large-base">
            <rect
                x={-halfWidth} y={-halfHeight}
                width={halfWidth * 2} height={halfHeight * 2}
                fill="none" stroke={color} strokeWidth={sw}
            />
            <line x1={-halfWidth} y1={-halfHeight} x2={halfWidth} y2={halfHeight}
                stroke={color} strokeWidth={sw} />
            <line x1={halfWidth} y1={-halfHeight} x2={-halfWidth} y2={halfHeight}
                stroke={color} strokeWidth={sw} />
        </g>
    );
};

// =============================================================
// 7. Опоры ВЛ — отдельностоящие (Рис. 16)
// =============================================================

interface VlPoleProps extends SymbolProps {
    /** а) промежуточная = окружность, б) угловая = треугольник, в) концевая = квадрат */
    type: "intermediate" | "angular" | "terminal";
    size?: number;
}

/**
 * Опоры ВЛ на самостоятельных стойках (Рис. 16).
 */
export const VlPoleSymbol: FC<VlPoleProps> = ({
    type,
    size = 6,
    s = 2,
    color = "black",
}) => {
    const sw = s / 2;
    switch (type) {
    case "intermediate":
        return <circle cx={0} cy={0} r={size} fill="none" stroke={color} strokeWidth={sw} />;
    case "angular":
        return (
            <polygon
                points={`0,${-size} ${-size},${size * 0.7} ${size},${size * 0.7}`}
                fill="none" stroke={color} strokeWidth={sw}
            />
        );
    case "terminal":
        return (
            <rect
                x={-size} y={-size}
                width={size * 2} height={size * 2}
                fill="none" stroke={color} strokeWidth={sw}
            />
        );
    }
};

// =============================================================
// 8. КОНТАКТНАЯ ПОДВЕСКА (Рис. 22)
// =============================================================

interface CatenaryProps extends SymbolProps {
    /** Длина (по оси X, в SVG-единицах) */
    length: number;
    /** Рабочая: одна толстая линия (S). Нерабочая: одна тонкая (S/2). */
    type: "working" | "non_working";
}

/**
 * Контактная подвеска (Рис. 22).
 * Рабочая — ОДНА линия толщиной S.
 * Нерабочая — ОДНА линия толщиной S/2.
 */
export const CatenarySymbol: FC<CatenaryProps> = ({
    length,
    type,
    s = 2,
    color = "black",
}) => (
    <line
        x1={0} y1={0}
        x2={length} y2={0}
        stroke={color}
        strokeWidth={type === "working" ? s : s / 2}
    />
);

// =============================================================
// 9. ЗИГЗАГ (Рис. 45)
// =============================================================

interface ZigzagProps extends SymbolProps {
    /** normal_to: вершиной к опоре, normal_from: от опоры, abnormal: + число, zero: ничего, split: два треугольника */
    type: "normal_to" | "normal_from" | "abnormal" | "zero" | "split";
    /** Направление к опоре: -1 = вверх (опора сверху), +1 = вниз */
    directionToPole?: DirectionSign;
    /** Величина зигзага в мм (для abnormal) */
    value?: number;
}

/**
 * Зигзаг контактного провода (Рис. 45).
 * Заполненный треугольник на линии подвески.
 * zero = ничего (нет обозначения).
 * split = два треугольника (разнесённая фиксация).
 */
export const ZigzagSymbol: FC<ZigzagProps> = ({
    type,
    directionToPole = -1,
    value,
    s = 2,
    color = "black",
}) => {
    if (type === "zero") return null;

    const triH = 5;
    const triW = 3;
    const dir = type === "normal_to" ? directionToPole : -directionToPole;

    const triangle = (offsetX: number = 0) => (
        <polygon
            points={`${offsetX},${dir * triH} ${offsetX - triW},0 ${offsetX + triW},0`}
            fill={color} stroke="none"
        />
    );

    if (type === "split") {
        return (
            <g className="zigzag-split">
                {triangle(-4)}
                {triangle(4)}
            </g>
        );
    }

    return (
        <g className="zigzag">
            {triangle()}
            {type === "abnormal" && value !== undefined && (
                <text x={triW + 2} y={0} fontSize={s * 2} fill={color}
                    dominantBaseline="central">
                    {value}
                </text>
            )}
        </g>
    );
};

// =============================================================
// 10. СРЕДНЯЯ АНКЕРОВКА (Рис. 37, 38)
// =============================================================

interface MidAnchorProps extends SymbolProps {
    /** Полукомпенсированная: прямые отрезки. Компенсированная: дуги. */
    catenaryType: "semi_compensated" | "compensated";
}

/**
 * Средняя анкеровка (Рис. 37, 38).
 * Два заполненных треугольника вершинами друг к другу.
 * Полукомпенсированная — соединены прямыми отрезками к линии подвески.
 * Компенсированная — соединены дугами.
 */
export const MidAnchorSymbol: FC<MidAnchorProps> = ({
    catenaryType,
    s = 2,
    color = "black",
}) => {
    const sw = s / 2;
    const triH = 5;
    const triW = 3;
    const spread = 12; // расстояние от линии подвески до треугольника

    return (
        <g className="mid-anchor">
            {/* Верхний треугольник (вершиной вниз) */}
            <polygon
                points={`0,${-spread + triH} ${-triW},${-spread} ${triW},${-spread}`}
                fill={color}
            />
            {/* Нижний треугольник (вершиной вверх) */}
            <polygon
                points={`0,${spread - triH} ${-triW},${spread} ${triW},${spread}`}
                fill={color}
            />

            {catenaryType === "semi_compensated" ? (
                <>
                    {/* Прямые отрезки к линии подвески (y=0) */}
                    <line x1={0} y1={-spread + triH} x2={0} y2={0}
                        stroke={color} strokeWidth={sw} />
                    <line x1={0} y1={spread - triH} x2={0} y2={0}
                        stroke={color} strokeWidth={sw} />
                </>
            ) : (
                <>
                    {/* Дуги к линии подвески */}
                    <path
                        d={`M 0,${-spread + triH} Q ${-spread * 0.5},${(-spread + triH) / 2} 0,0`}
                        fill="none" stroke={color} strokeWidth={sw}
                    />
                    <path
                        d={`M 0,${spread - triH} Q ${-spread * 0.5},${(spread - triH) / 2} 0,0`}
                        fill="none" stroke={color} strokeWidth={sw}
                    />
                </>
            )}
        </g>
    );
};

// =============================================================
// 11. АНКЕРОВКИ — стрелочки (Рис. 17, 19)
// =============================================================

interface AnchorageArrowProps extends SymbolProps {
    /** Размер стрелочки */
    size?: number;
    /** Закрашенная или нет */
    filled: boolean;
    /** Угол раскрыва стрелки (90° для незакрашенной в цепной подвеске) */
    angle?: number;
}

/**
 * Стрелочка анкеровки.
 * Рисуется в (0,0), указывает влево (в сторону опоры).
 * Для направления вправо — оборачивать в transform="scale(-1,1)".
 */
export const AnchorageArrow: FC<AnchorageArrowProps> = ({
    size = 5,
    filled,
    angle = 60,
    s = 2,
    color = "black",
}) => {
    const sw = s / 2;
    const halfAngle = (angle / 2) * Math.PI / 180;
    const dx = size * Math.cos(halfAngle);
    const dy = size * Math.sin(halfAngle);

    return (
        <polygon
            points={`0,0 ${dx},${-dy} ${dx},${dy}`}
            fill={filled ? color : "none"}
            stroke={color}
            strokeWidth={sw}
        />
    );
};

// =============================================================
// 12. АНКЕРНЫЙ УЧАСТОК — стрелка с длиной и номером (Рис. 44)
// =============================================================

interface AnchorSectionArrowProps extends SymbolProps {
    /** Длина стрелки в SVG-единицах */
    length: number;
    /** Длина АУ в метрах */
    sectionLength: number;
    /** Номер АУ (римский или арабский) */
    sectionNumber: string;
}

/**
 * Стрелка анкерного участка (Рис. 44).
 * Стрелки указывают в сторону анкерных опор (к краям).
 * Над — длина в метрах, под — номер.
 */
export const AnchorSectionArrow: FC<AnchorSectionArrowProps> = ({
    length,
    sectionLength,
    sectionNumber,
    s = 2,
    color = "black",
}) => {
    const sw = s / 2;
    const arrowH = 3;

    return (
        <g className="anchor-section-arrow">
            <line x1={0} y1={0} x2={length} y2={0} stroke={color} strokeWidth={sw} />
            {/* Наконечник слева */}
            <polygon
                points={`0,0 ${arrowH},${-arrowH / 2} ${arrowH},${arrowH / 2}`}
                fill={color}
            />
            {/* Наконечник справа */}
            <polygon
                points={`${length},0 ${length - arrowH},${-arrowH / 2} ${length - arrowH},${arrowH / 2}`}
                fill={color}
            />
            {/* Длина — над */}
            <text x={length / 2} y={-4} textAnchor="middle" fontSize={s * 2} fill={color}>
                {sectionLength}
            </text>
            {/* Номер — под */}
            <text x={length / 2} y={4 + s * 2} textAnchor="middle" fontSize={s * 2} fill={color}>
                {sectionNumber}
            </text>
        </g>
    );
};

// =============================================================
// 13. ПИКЕТЫ (п. 2.8)
// =============================================================

interface PicquetProps extends SymbolProps {
    height?: number;
    /** Текст ординаты */
    label: string;
}

/**
 * Пикет — вертикальная линия + горизонтальная полка + ордината.
 */
export const PicquetSymbol: FC<PicquetProps> = ({
    height = 40,
    label,
    s = 2,
    color = "black",
}) => {
    const sw = s / 2;
    const shelfWidth = 12;

    return (
        <g className="picquet">
            <line x1={0} y1={0} x2={0} y2={-height} stroke={color} strokeWidth={sw} />
            <line x1={0} y1={-height} x2={shelfWidth} y2={-height} stroke={color} strokeWidth={sw} />
            <text x={shelfWidth / 2} y={-height - 3} textAnchor="middle" fontSize={s * 2} fill={color}>
                {label}
            </text>
        </g>
    );
};

// =============================================================
// 14. ПРОВОДА — паттерны с буквенными вставками (Рис. 25)
// =============================================================

/**
 * Тип провода для отрисовки.
 * Провода рисуются как штриховые линии с текстовыми вставками
 * (буквы/символы повторяются каждые 2-3 пролёта).
 */
export type WireType =
    | "feeding_25"    // а) Питающий 2×25 кВ: ─ П ─ П ─
    | "reinforcing"   // б) Усиливающий: ─  ─  ─ (простая штриховка)
    | "screening"     // в) Экранирующий: ─ Э ─ Э ─
    | "return_air"    // г) Отсасывающая: ─ | ─ | ─
    | "grounding"     // д) Групповое заземление: ─ V ─ V ─
    | "radio_guide"   // е) ПРС: ── ~ ── ~ ──
    | "vl"            // ж) ВЛ: ─ ВЛ-АБ ─ ВЛ-АБ ─
    | "volp";         // з) ВОЛП: ── ВОЛП ── ВОЛП ──

/**
 * Символ-вставка для каждого типа провода.
 * Вставляется в разрывы штриховой линии.
 */
export function getWireInsertSymbol(wireType: WireType): string {
    switch (wireType) {
    case "feeding_25": return "П";
    case "reinforcing": return "";         // без символа, просто штрих
    case "screening": return "Э";
    case "return_air": return "|";
    case "grounding": return "V";
    case "radio_guide": return "~";
    case "vl": return "";                  // подпись задаётся отдельно (ВЛ-АБ и т.д.)
    case "volp": return "ВОЛП";
    }
}

/**
 * Dash-паттерн для штриховой линии провода (без символов).
 * Символы рисуются как <text> в разрывах — см. WireFigure.
 */
export function getWireDashArray(wireType: WireType, s: number = 2): string {
    switch (wireType) {
    case "reinforcing":
        return `${s * 5} ${s * 3}`;                   // простая штриховка
    case "radio_guide":
    case "volp":
        return `${s * 8} ${s * 4}`;                   // длинные штрихи (больше места для текста)
    default:
        return `${s * 5} ${s * 3}`;                   // стандартный штрих с разрывами для букв
    }
}

/**
 * Маркировочные подписи линий ВЛ.
 */
export function getVlLabel(
    vlType: "vl_ab" | "vl_pe" | "vl_pr" | "vl_dpr" | "vl_low"
): string {
    const labels: Record<string, string> = {
        vl_ab: "ВЛ-АБ",
        vl_pe: "ВЛ-ПЭ",
        vl_pr: "ВЛ-ПР",
        vl_dpr: "ВЛ-ДПР",
        vl_low: "ВЛнв",
    };
    return labels[vlType] ?? vlType;
}

// =============================================================
// 15. ИЗОЛЯТОРЫ (Рис. 29)
// =============================================================

/**
 * Врезной изолятор (Рис. 29а).
 * ДВЕ короткие поперечные черты на проводе.
 */
export const SpliceInsulatorSymbol: FC<SymbolProps> = ({
    s = 2,
    color = "black",
}) => {
    const h = 4;
    const gap = 2;
    const sw = s / 2;
    return (
        <g className="splice-insulator">
            <line x1={-gap} y1={-h} x2={-gap} y2={h} stroke={color} strokeWidth={sw} />
            <line x1={gap} y1={-h} x2={gap} y2={h} stroke={color} strokeWidth={sw} />
        </g>
    );
};

/**
 * Секционный изолятор (Рис. 29б).
 * Две короткие поперечные черты + третья (длиннее) между ними.
 */
export const SectionInsulatorSymbol: FC<SymbolProps> = ({
    s = 2,
    color = "black",
}) => {
    const hShort = 4;
    const hLong = 6;
    const gap = 3;
    const sw = s / 2;
    return (
        <g className="section-insulator">
            <line x1={-gap} y1={-hShort} x2={-gap} y2={hShort} stroke={color} strokeWidth={sw} />
            <line x1={0} y1={-hLong} x2={0} y2={hLong} stroke={color} strokeWidth={sw} />
            <line x1={gap} y1={-hShort} x2={gap} y2={hShort} stroke={color} strokeWidth={sw} />
        </g>
    );
};

// =============================================================
// 16. ЭЛЕКТРИЧЕСКИЕ СОЕДИНИТЕЛИ (Рис. 42, 43)
// =============================================================

/**
 * Поперечный соединитель (Рис. 42).
 * Точка на линии КС + надпись «ПС».
 */
export const TransverseConnectorSymbol: FC<SymbolProps> = ({
    s = 2,
    color = "black",
}) => (
    <g className="transverse-connector">
        <circle cx={0} cy={0} r={2} fill={color} />
        <text x={4} y={0} fontSize={s * 1.5} fill={color} dominantBaseline="central">
            ПС
        </text>
    </g>
);

/**
 * Продольный соединитель (Рис. 43).
 * Дуга, соединяющая подвески.
 */
export const LongitudinalConnectorSymbol: FC<SymbolProps & { width?: number }> = ({
    width = 12,
    s = 2,
    color = "black",
}) => {
    const sw = s / 2;
    const h = width / 3;
    return (
        <path
            d={`M ${-width / 2},0 Q 0,${-h} ${width / 2},0`}
            fill="none" stroke={color} strokeWidth={sw}
        />
    );
};

// =============================================================
// 17. РАЗЪЕДИНИТЕЛИ (Рис. 48) — упрощённые
// =============================================================

interface DisconnectorProps extends SymbolProps {
    state: "on" | "off";
    poles: 1 | 2 | 3;
}

/**
 * Разъединитель с ручным приводом (Рис. 48).
 */
export const DisconnectorSymbol: FC<DisconnectorProps> = ({
    state,
    poles,
    s = 2,
    color = "black",
}) => {
    const sw = s / 2;
    const len = 8;
    const gap = 3;

    const elements = [];
    for (let i = 0; i < poles; i++) {
        const y = (i - (poles - 1) / 2) * gap;
        elements.push(
            <line key={`w${i}`} x1={-len} y1={y} x2={len} y2={y}
                stroke={color} strokeWidth={sw} />
        );
        elements.push(
            state === "off"
                ? <line key={`b${i}`} x1={0} y1={y} x2={len * 0.6} y2={y - len * 0.5}
                    stroke={color} strokeWidth={sw} />
                : <line key={`b${i}`} x1={0} y1={y} x2={len * 0.7} y2={y}
                    stroke={color} strokeWidth={s} />
        );
    }

    return <g className="disconnector">{elements}</g>;
};

// =============================================================
// 18. ПОДПИСИ — длина пролёта, номер опоры (Рис. 46)
// =============================================================

/**
 * Длина пролёта — подчёркнутое число (Рис. 46).
 */
export const SpanLengthLabel: FC<SymbolProps & { length: number }> = ({
    length, s = 2, color = "black",
}) => (
    <text x={0} y={0} textAnchor="middle" fontSize={s * 2} fill={color}
        textDecoration="underline">
        {length}
    </text>
);

/**
 * Номер опоры + тип заземления (Рис. 46).
 * Числитель — номер, знаменатель — заземление.
 */
export const PoleNumberLabel: FC<SymbolProps & {
    number: string;
    grounding?: "И" | "ИИ" | "ИДЗ" | "ГДЗ" | "ТГЗ" | "-" | "";
}> = ({
    number, grounding = "", s = 2, color = "black",
}) => {
    const fs = s * 2;
    const lh = fs + 2;

    return (
        <g className="pole-number-label">
            <text x={0} y={0} textAnchor="middle" fontSize={fs} fill={color}>
                {number}
            </text>
            {grounding && (
                <>
                    <line x1={-fs} y1={lh * 0.3} x2={fs} y2={lh * 0.3}
                        stroke={color} strokeWidth={s / 2} />
                    <text x={0} y={lh} textAnchor="middle" fontSize={fs} fill={color}>
                        {grounding}
                    </text>
                </>
            )}
        </g>
    );
};

// =============================================================
// 19. СЛУЖЕБНЫЕ ЗДАНИЯ, СВЕТОФОР, ПЛАТФОРМА
// =============================================================

/**
 * Служебно-техническое здание (Рис. 2).
 * Прямоугольник + сокращение (ЭЧЭ, ТП, ПС и т.д.).
 */
export const BuildingSymbol: FC<SymbolProps & {
    label: string; width?: number; height?: number;
}> = ({
    label, width = 20, height = 12, s = 2, color = "black",
}) => (
    <g className="building">
        <rect x={-width / 2} y={-height / 2} width={width} height={height}
            fill="none" stroke={color} strokeWidth={s / 2} />
        <text x={0} y={0} textAnchor="middle" dominantBaseline="central"
            fontSize={s * 1.5} fill={color}>
            {label}
        </text>
    </g>
);

/**
 * Светофор (Рис. 12) — выноска с обозначением.
 */
export const SignalSymbol: FC<SymbolProps & { label: string }> = ({
    label, s = 2, color = "black",
}) => {
    const sw = s / 2;
    return (
        <g className="signal">
            <circle cx={0} cy={0} r={2} fill={color} />
            <line x1={0} y1={0} x2={0} y2={-15} stroke={color} strokeWidth={sw} />
            <line x1={0} y1={-15} x2={10} y2={-15} stroke={color} strokeWidth={sw} />
            <text x={11} y={-13} fontSize={s * 2} fill={color}>{label}</text>
        </g>
    );
};

/**
 * Опасное место (Рис. 57).
 */
export const DangerZoneSymbol: FC<SymbolProps> = ({
    s = 2, color = "black",
}) => {
    const sw = s / 2;
    const h = 12;
    const w = 7;
    return (
        <g className="danger-zone">
            <polygon
                points={`0,${-h} ${-w},${h * 0.3} ${w},${h * 0.3}`}
                fill="none" stroke={color} strokeWidth={sw}
            />
            <text x={0} y={0} textAnchor="middle" dominantBaseline="central"
                fontSize={s * 3} fontWeight="bold" fill={color}>
                !
            </text>
        </g>
    );
};

/**
 * Воздушная стрелка (Рис. 40) — пересечение подвесок.
 */
export const AirSwitchSymbol: FC<SymbolProps> = ({
    s = 2, color = "black",
}) => {
    const d = 4;
    const sw = s / 2;
    return (
        <g className="air-switch">
            <line x1={-d} y1={-d} x2={d} y2={d} stroke={color} strokeWidth={sw} />
            <line x1={d} y1={-d} x2={-d} y2={d} stroke={color} strokeWidth={sw} />
        </g>
    );
};

/**
 * Короткозамыкатель (Рис. 52).
 */
export const ShortCircuiterSymbol: FC<SymbolProps> = ({
    s = 2, color = "black",
}) => {
    const sw = s / 2;
    return (
        <g className="short-circuiter">
            <line x1={-5} y1={0} x2={5} y2={0} stroke={color} strokeWidth={sw} />
            <line x1={0} y1={-5} x2={0} y2={5} stroke={color} strokeWidth={sw} />
            <circle cx={0} cy={0} r={3} fill="none" stroke={color} strokeWidth={sw} />
        </g>
    );
};

/**
 * ОПН — ограничитель перенапряжений (Рис. 55).
 */
export const SurgeArresterSymbol: FC<SymbolProps> = ({
    s = 2, color = "black",
}) => {
    const sw = s / 2;
    return (
        <g className="surge-arrester">
            <rect x={-4} y={-6} width={8} height={12}
                fill="none" stroke={color} strokeWidth={sw} />
            <line x1={0} y1={-6} x2={0} y2={-10} stroke={color} strokeWidth={sw} />
            <line x1={0} y1={6} x2={0} y2={10} stroke={color} strokeWidth={sw} />
            <line x1={-4} y1={10} x2={4} y2={10} stroke={color} strokeWidth={sw} />
            <line x1={-2.5} y1={12} x2={2.5} y2={12} stroke={color} strokeWidth={sw} />
            <line x1={-1} y1={14} x2={1} y2={14} stroke={color} strokeWidth={sw} />
        </g>
    );
};