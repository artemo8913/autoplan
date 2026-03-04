import { observer } from "mobx-react-lite";

import { useStore } from "@/app/store";
import { AttachmentFigure } from "./AttachmentFigure";

export const AttachmentsLayer = observer(() => {
    const { attachmentsStore } = useStore();
    return (
        <g className="attachmentsLayer">
            {attachmentsStore.list.map(
                (attachment) => <AttachmentFigure key={attachment.id} attachment={attachment} />
            )}
        </g>
    );
});
