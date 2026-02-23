import type { FC } from "react";

import type { Attachment } from "../lib/Attachment";

interface AttachmentFigureProps {
    attachment: Attachment
}

export const AttachmentFigure: FC<AttachmentFigureProps> = ({attachment}) => {
    const startPath = `M${attachment.startPos.x},${attachment.startPos.y}`;
    const endPath = `L${attachment.endPos.x},${attachment.endPos.y}`;

    return (
        <path
            d={startPath + " " + endPath}
            fill="none"
            stroke="purple"
            strokeWidth="4"
        />
    );
};