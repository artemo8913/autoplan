import type { CounterStore } from "@/entities/counter";
import type { UIStore } from "./UIStore";
import type { PolesStore } from "./PolesStore";
import type { TracksStore } from "./TracksStore";
import type { FixingPointsStore } from "./FixingPointsStore";
import type { AnchorSectionsStore } from "./AnchorSectionsStore";
import type { JunctionsStore } from "./JunctionsStore";
import type { VlPolesStore } from "./VlPolesStore";
import type { WireLinesStore } from "./WireLinesStore";
import type { CrossSpansStore } from "./CrossSpansStore";

export interface Store {
    counterStore: CounterStore;
    uiStore: UIStore;
    polesStore: PolesStore;
    tracksStore: TracksStore;
    fixingPointsStore: FixingPointsStore;
    anchorSectionsStore: AnchorSectionsStore;
    junctionsStore: JunctionsStore;
    vlPolesStore: VlPolesStore;
    wireLinesStore: WireLinesStore;
    crossSpansStore: CrossSpansStore;
}
