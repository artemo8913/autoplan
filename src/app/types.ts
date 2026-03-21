//STORE
import { PolesStore } from "./store/PolesStore";
import { TracksStore } from "./store/TracksStore";
import { FixingPointsStore } from "./store/FixingPointsStore";
import { AnchorSectionsStore } from "./store/AnchorSectionsStore";
import { JunctionsStore } from "./store/JunctionsStore";
import { VlPolesStore } from "./store/VlPolesStore";
import { WireLinesStore } from "./store/WireLinesStore";
import { CrossSpansStore } from "./store/CrossSpansStore";
import { ToolStateStore } from "./store/ToolStateStore";
import { CameraStore } from "./store/CameraStore";
import { UndoStackStore } from "./store/UndoStackStore";
import { AppStore } from "./store/AppStore";
import { PlansStore } from "./store/PlansStore";
import type { UIPanelsStore } from "./store/UIPanelsStore";

//SERVICE
import { InputHandlerService } from "./services/InputHandler";
import { HitTestService } from "./services/HitTestService";
import { SnapService } from "./services/SnapService";
import { CameraService } from "./services/CameraService";
import type { PlanService } from "./services/PlanService";

export interface PlanEntityStores {
    polesStore: PolesStore;
    tracksStore: TracksStore;
    fixingPointsStore: FixingPointsStore;
    anchorSectionsStore: AnchorSectionsStore;
    junctionsStore: JunctionsStore;
    vlPolesStore: VlPolesStore;
    wireLinesStore: WireLinesStore;
    crossSpansStore: CrossSpansStore;
}

export interface Store extends PlanEntityStores {
    toolStateStore: ToolStateStore;
    cameraStore: CameraStore;
    appStore: AppStore;
    plansStore: PlansStore;
    undoStackStore: UndoStackStore;
    uiPanelsStore: UIPanelsStore;
}

export interface Services {
    inputHandlerService: InputHandlerService;
    hitTestService: HitTestService;
    snapService: SnapService;
    cameraService: CameraService;
    planService: PlanService;
}
