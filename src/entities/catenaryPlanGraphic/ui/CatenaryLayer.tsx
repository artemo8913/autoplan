import { observer } from "mobx-react-lite";

import { calcSvgPath } from "@/shared/svg/svgPath";
import { useStore } from "@/app";

import type { AnchorSection } from "../model/AnchorSection";
import { sectionOverlapRanges } from "../lib/labelLayout";

interface SectionCatenaryProps {
    section: AnchorSection;
}

/**
 * Провод одной АУ. Собственный observer: перемещение опоры перерисовывает только те АУ,
 * в которые она входит, а не весь слой.
 */
function SectionCatenaryBase({ section }: SectionCatenaryProps) {
    const { junctionsStore, displaySettingsStore } = useStore();

    const ranges = sectionOverlapRanges(section.id, junctionsStore.list);
    const dPath = calcSvgPath(section.getCatenaryPoses(ranges, displaySettingsStore.zigzagDrawScale));

    return (
        <g className="svg-clickable">
            <path d={dPath} fill="none" strokeWidth={displaySettingsStore.catenaryStrokeWidth} stroke="red" />
            {/* Прозрачная широкая линия — расширяет зону наведения для hover-подсветки */}
            <path
                d={dPath}
                fill="none"
                stroke="transparent"
                strokeWidth={displaySettingsStore.catenaryStrokeWidth * 6}
            />
        </g>
    );
}

// observer сам оборачивает компонент в React.memo — отдельный memo не нужен.
const SectionCatenary = observer(SectionCatenaryBase);

function CatenaryLayerBase() {
    const { anchorSectionsStore } = useStore();

    return (
        <g className="catenaryLayer">
            {anchorSectionsStore.list.map((section) => (
                <SectionCatenary key={section.id} section={section} />
            ))}
        </g>
    );
}

export const CatenaryLayer = observer(CatenaryLayerBase);
