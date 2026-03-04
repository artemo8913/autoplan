import { makeAutoObservable } from "mobx";

import type { Attachment } from "@/entities/lib/Attachment";

export class AttachmentsStore {
    attachments: Map<string, Attachment>;

    get list(): Attachment[] {
        return [...this.attachments.values()];
    }

    constructor(attachments: Attachment[]) {
        this.attachments = new Map(attachments.map(a => [a.id, a]));
        makeAutoObservable(this);
    }
}
