import type { FC } from "react";


import type { Attachment } from "../lib/Attachment";
import { AttachmentFigure } from "./AttachmentFigure";

type AttachmentsLayerProps = {
    attachments: Attachment[]
}

export const AttachmentsLayer: FC<AttachmentsLayerProps> = (props) => {
    return (
        <g className="attachmentsLayer">
            {props.attachments.map(
                (attachment) => <AttachmentFigure key={attachment.id} attachment={attachment} />)}
        </g>
    );
};