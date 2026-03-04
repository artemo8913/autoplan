import type { CounterStore } from "@/entities/counter";
import type { UIStore } from "./UIStore";
import type { PolesStore } from "./PolesStore";
import type { TracksStore } from "./TracksStore";
import type { AttachmentsStore } from "./AttachmentsStore";
import type { AnchorSectionsStore } from "./AnchorSectionsStore";
import type { JunctionsStore } from "./JunctionsStore";

export interface Store {
    counterStore: CounterStore;
    uiStore: UIStore;
    polesStore: PolesStore;
    tracksStore: TracksStore;
    attachmentsStore: AttachmentsStore;
    anchorSectionsStore: AnchorSectionsStore;
    junctionsStore: JunctionsStore;
}
