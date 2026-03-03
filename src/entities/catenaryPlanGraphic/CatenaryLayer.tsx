import type { FC } from "react";

import type { AnchorSection } from "../lib/AnchorSection";
import { observer } from "mobx-react-lite";
import { useServices } from "@/app/services";


type CatenaryLayerProps = {
    anchorSections: AnchorSection[];

}

export const CatenaryLayer: FC<CatenaryLayerProps> = observer((props) => {
    const { svgDrawer } = useServices();

    return (
        <g className="catenaryLayer">
            {props.anchorSections.map(section => {
                const dPath = svgDrawer.calcSVGPath(section.poses);
                
                return <g key={section.id}>
                    <path d={dPath} fill="none" strokeWidth={4} stroke="red" />
                </g>;
            })}
        </g>
    );
});