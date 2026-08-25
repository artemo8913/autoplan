import { observer } from "mobx-react-lite";

import { SpanLengthLabel } from "@/shared/ui/gost-symbols";
import { useStore } from "@/app";

import type { FixingPoint } from "../model/FixingPoint";
import { collectSpanPairs, spanLabelLayout } from "../lib/labelLayout";

interface SpanLengthFigureProps {
    leftFp: FixingPoint;
    rightFp: FixingPoint;
}

/** Подпись одного пролёта: перерисовывается только при сдвиге своих опор. */
function SpanLengthFigureBase({ leftFp, rightFp }: SpanLengthFigureProps) {
    const { displaySettingsStore } = useStore();
    const { pos, spanLength } = spanLabelLayout(leftFp, rightFp, displaySettingsStore);

    return (
        <g className="svg-clickable" transform={`translate(${pos.x}, ${pos.y})`}>
            <SpanLengthLabel length={spanLength} s={displaySettingsStore.spanLabelSize} />
        </g>
    );
}

// observer сам оборачивает компонент в React.memo — отдельный memo не нужен.
const SpanLengthFigure = observer(SpanLengthFigureBase);

function SpanLengthLayerBase() {
    const { anchorSectionsStore } = useStore();

    // Список пар — структурный (координаты здесь не читаются), поэтому сдвиг опоры
    // не пересобирает слой целиком: обновляется только подпись затронутого пролёта.
    const pairs = collectSpanPairs(anchorSectionsStore.list);

    return (
        <g className="spanLengthLayer">
            {pairs.map(({ key, leftFp, rightFp }) => (
                <SpanLengthFigure key={key} leftFp={leftFp} rightFp={rightFp} />
            ))}
        </g>
    );
}

export const SpanLengthLayer = observer(SpanLengthLayerBase);
