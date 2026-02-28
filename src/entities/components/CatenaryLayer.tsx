import type { FC } from "react";

import type { AnchorSection } from "../lib/AnchorSection";
import { observer } from "mobx-react-lite";
import { useServices } from "@/app/services";


type CatenaryLayerProps = {
    anchorSections: AnchorSection[];

}

export const CatenaryLayer: FC<CatenaryLayerProps> = observer((props) => {
    return (
        <g className="catenaryLayer">
            {props.anchorSections.map(section => {
                const { svgDrawer } = useServices();
                const dPath = svgDrawer.calcSVGPath(section.poses);
                
                return <g>
                    <path d={dPath} fill="none" strokeWidth={4} stroke="red" />
                </g>;
            })}
        </g>
    );
});