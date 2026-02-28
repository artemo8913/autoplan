import type { FC } from "react";

import type { Attachment } from "../lib/Attachment";

interface AttachmentFigureProps {
    attachment: Attachment;
}

export const AttachmentFigure: FC<AttachmentFigureProps> = ({ attachment }) => {
    const { startPos, endPos } = attachment;
    return (
        <line
            x1={startPos.x} y1={startPos.y}
            x2={endPos.x} y2={endPos.y}
            stroke="black"
            strokeWidth={1}
        />
    );
};