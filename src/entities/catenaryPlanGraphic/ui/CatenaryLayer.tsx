import { observer } from "mobx-react-lite";

import { calcSvgPath } from "@/shared/svg/svgPath";
import { useStore } from "@/app";

export const CatenaryLayer = observer(() => {
    const { anchorSectionsStore, junctionsStore } = useStore();

    return (
        <g className="catenaryLayer">
            {anchorSectionsStore.list.map(section => {
                const junction = junctionsStore.list.find(j =>
                    j.section1.id === section.id || j.section2.id === section.id
                );
                const poses = section.getCatenaryPoses(junction?.overlapXRange);
                const dPath = calcSvgPath(poses);

                return (
                    <g key={section.id}>
                        <path d={dPath} fill="none" strokeWidth={4} stroke="red" />
                    </g>
                );
            })}
        </g>
    );
});
