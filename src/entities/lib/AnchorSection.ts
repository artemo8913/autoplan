import { CatenaryType } from "@/shared/types";

import type { Pole } from "./Pole";
import type { Attachment } from "./Attachment";

interface AnchorSectionConstructorParams {
    type: CatenaryType;
    attachments: Attachment[];
    startPole: Pole;
    endPole: Pole;
}

export class AnchorSection {
    private _id: string;
    private _type: CatenaryType = CatenaryType.CS140;
    private _attachments: Attachment[];
    private _startPole: Pole;
    private _endPole: Pole;

    private _isAttachmentOnAnchorPole(attachment: Attachment){
        return attachment.pole.id === this._startPole.id || attachment.pole.id === this._endPole.id;
    }

    get id(){
        return this._id;
    }
    
    get attachments() { return this._attachments; }

    get poses(){
        return this._attachments.map(attachment => {
            if(this._isAttachmentOnAnchorPole(attachment)){
                return attachment.pole.pos;
            }

            return attachment.endPos;
        });
    }

    constructor(params: AnchorSectionConstructorParams){
        this._id = crypto.randomUUID();
        this._attachments = params.attachments;
        this._type = params.type;
        this._startPole = params.startPole;
        this._endPole = params.endPole;
    }
}