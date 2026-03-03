import type { FC } from "react";
import { observer } from "mobx-react-lite";

import type { Attachment } from "../lib/Attachment";
import { ZigzagFigure } from "./ZigzagFigure";

type ZigzagLayerProps = {
    attachments: Attachment[];
};

export const ZigzagLayer: FC<ZigzagLayerProps> = observer(({ attachments }) => (
    <g className="zigzagLayer">
        {attachments.map(a => <ZigzagFigure key={a.id} attachment={a} />)}
    </g>
));
