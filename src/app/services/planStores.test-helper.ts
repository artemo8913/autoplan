import { Railway } from "@/entities/catenaryPlanGraphic";

import type { PlanEntityStores } from "../types";
import { CatenaryPoleStore } from "../store/CatenaryPoleStore";
import { TracksStore } from "../store/TracksStore";
import { FixingPointsStore } from "../store/FixingPointsStore";
import { AnchorSectionsStore } from "../store/AnchorSectionsStore";
import { JunctionsStore } from "../store/JunctionsStore";
import { VlPolesStore } from "../store/VlPolesStore";
import { WireLinesStore } from "../store/WireLinesStore";
import { CrossSpansStore } from "../store/CrossSpansStore";
import { DisconnectorsStore } from "../store/DisconnectorsStore";

/** Пустой набор entity-сторов для тестов сервисов и каскада. */
export function makePlanEntityStores(railway = new Railway({ name: "R", startX: 0, endX: 10000 })): PlanEntityStores {
    return {
        catenaryPoleStore: new CatenaryPoleStore([]),
        tracksStore: new TracksStore([], railway),
        fixingPointsStore: new FixingPointsStore([]),
        anchorSectionsStore: new AnchorSectionsStore([]),
        junctionsStore: new JunctionsStore([]),
        vlPolesStore: new VlPolesStore([]),
        wireLinesStore: new WireLinesStore([]),
        crossSpansStore: new CrossSpansStore([]),
        disconnectorsStore: new DisconnectorsStore([]),
    };
}
