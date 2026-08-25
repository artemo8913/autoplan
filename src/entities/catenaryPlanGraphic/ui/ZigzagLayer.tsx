import { observer } from "mobx-react-lite";

import { ZigzagSymbol } from "@/shared/ui/gost-symbols";
import { useStore } from "@/app";

import type { AnchorSection } from "../model/AnchorSection";
import type { FixingPoint } from "../model/FixingPoint";
import { fpDirectionToPole, sectionOverlapRanges, zigzagAnchorPos, zigzagDrawOffset } from "../lib/labelLayout";

interface ZigzagFigureProps {
    fixingPoint: FixingPoint;
    /** АУ, которой принадлежит ТФ: по её сопряжениям считается смещение зигзага. */
    section?: AnchorSection;
}

function ZigzagFigureBase({ fixingPoint, section }: ZigzagFigureProps) {
    const { junctionsStore, displaySettingsStore } = useStore();
    const { zigzagSymbolSize, zigzagTextXOffset, zigzagTextYMultiplier, zigzagLabelFontSize } = displaySettingsStore;
    const { zigzagValue } = fixingPoint;

    if (zigzagValue === undefined) {
        return null;
    }

    const ranges = section ? sectionOverlapRanges(section.id, junctionsStore.list) : [];
    const drawOffsetY = zigzagDrawOffset(fixingPoint, ranges, displaySettingsStore.zigzagDrawScale);
    const anchor = zigzagAnchorPos(fixingPoint, drawOffsetY);
    const directionToPole = fpDirectionToPole(fixingPoint);

    const type = zigzagValue > 0 ? "normal_from" : zigzagValue < 0 ? "normal_to" : "zero";
    const label = zigzagValue > 0 ? `+${zigzagValue}` : `${zigzagValue}`;

    return (
        <g transform={`translate(${anchor.x},${anchor.y})`}>
            <ZigzagSymbol type={type} directionToPole={directionToPole} s={zigzagSymbolSize} />
            <text
                x={zigzagTextXOffset}
                y={directionToPole * zigzagTextYMultiplier}
                fontSize={zigzagLabelFontSize}
                textAnchor="start"
                fill="black"
            >
                {label}
            </text>
        </g>
    );
}

// observer сам оборачивает компонент в React.memo — отдельный memo не нужен.
const ZigzagFigure = observer(ZigzagFigureBase);

function ZigzagLayerBase() {
    const { fixingPointsStore, anchorSectionsStore } = useStore();

    // ТФ → его АУ. ТФ вне АУ (например, на линии ВЛ) рисуются без зоны сопряжения.
    const sectionByFpId = new Map<string, AnchorSection>();
    for (const section of anchorSectionsStore.list) {
        for (const fp of section.fixingPoints) {
            sectionByFpId.set(fp.id, section);
        }
    }

    return (
        <g className="zigzagLayer">
            {fixingPointsStore.list.map((fp) => (
                <ZigzagFigure key={fp.id} fixingPoint={fp} section={sectionByFpId.get(fp.id)} />
            ))}
        </g>
    );
}

export const ZigzagLayer = observer(ZigzagLayerBase);
