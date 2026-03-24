import React from "react";

export const PanIcon: React.FC = () => (
    <svg viewBox="0 0 18 18" width={18} height={18} fill="currentColor">
        <path d="M9 1L7 4h4L9 1zM9 17l-2-3h4l-2 3zM1 9l3-2v4L1 9zM17 9l-3-2v4l3-2z" />
        <path d="M9 4v10M4 9h10" stroke="currentColor" strokeWidth={1} fill="none" />
    </svg>
);

export const SelectIcon: React.FC = () => (
    <svg viewBox="0 0 18 18" width={18} height={18} fill="currentColor">
        <path d="M3 2l5 13 2.5-4.5L15 16l1.5-1.5-4.5-4.5L16 7.5 3 2z" />
    </svg>
);

export const TracksIcon: React.FC = () => (
    <svg viewBox="0 0 18 18" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.5}>
        <line x1={1} y1={5} x2={17} y2={5} />
        <line x1={1} y1={9} x2={17} y2={9} />
        <line x1={1} y1={13} x2={17} y2={13} />
    </svg>
);

export const LinesIcon: React.FC = () => (
    <svg viewBox="0 0 18 18" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path d="M2 5 L6 3 L10 6 L14 4 L17 5" />
        <path d="M2 10 L6 8 L10 11 L14 9 L17 10" />
        <path d="M2 15 L6 13 L10 16 L14 14 L17 15" strokeDasharray="3 2" />
    </svg>
);

/** Иконка опоры: круг / квадрат / треугольник, с подписью в правом нижнем углу */
export const PoleIcon: React.FC<{ shape: "circle" | "square" | "triangle"; label: string }> = ({ shape, label }) => (
    <svg viewBox="0 0 22 20" width={22} height={20}>
        {shape === "circle" && (
            <circle cx={8} cy={9} r={6} fill="none" stroke="currentColor" strokeWidth={1.5} />
        )}
        {shape === "square" && (
            <rect x={2} y={3} width={12} height={12} fill="none" stroke="currentColor" strokeWidth={1.5} />
        )}
        {shape === "triangle" && (
            <polygon points="8,2 15,15 1,15" fill="none" stroke="currentColor" strokeWidth={1.5} />
        )}
        <text x={21} y={19} fontSize={6} fontFamily="monospace" fill="currentColor" textAnchor="end">{label}</text>
    </svg>
);
