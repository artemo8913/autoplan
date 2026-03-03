import type { FC } from "react";
import { observer } from "mobx-react-lite";

import type { Attachment } from "../lib/Attachment";

interface AttachmentFigureProps {
    attachment: Attachment;
}

export const AttachmentFigure: FC<AttachmentFigureProps> = observer(({ attachment }) => {
    const { startPos, endPos } = attachment;
    return (
        <line
            x1={startPos.x} y1={startPos.y}
            x2={endPos.x} y2={endPos.y}
            stroke="black"
            strokeWidth={1}
        />
    );
});