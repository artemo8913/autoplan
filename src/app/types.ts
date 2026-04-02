//STORE
import { PolesStore } from "./store/PolesStore";
import { TracksStore } from "./store/TracksStore";
import { FixingPointsStore } from "./store/FixingPointsStore";
import { AnchorSectionsStore } from "./store/AnchorSectionsStore";
import { JunctionsStore } from "./store/JunctionsStore";
import { VlPolesStore } from "./store/VlPolesStore";
import { WireLinesStore } from "./store/WireLinesStore";
import { CrossSpansStore } from "./store/CrossSpansStore";
import { DisconnectorsStore } from "./store/DisconnectorsStore";
import { ToolStateStore } from "./store/ToolStateStore";
import { CameraStore } from "./store/CameraStore";
import { SelectionStore } from "./store/SelectionStore";
import { UndoStackStore } from "./store/UndoStackStore";
import { AppStore } from "./store/AppStore";
import { PlansStore } from "./store/PlansStore";
import { UIPanelsStore } from "./store/UIPanelsStore";
import { InlineEditStore } from "./store/InlineEditStore";
import { DisplaySettingsStore } from "./store/DisplaySettingsStore";

//SERVICE
import { InputHandlerService } from "./services/InputHandler";
import { HitTestService } from "./services/HitTestService";
import { SnapService } from "./services/SnapService";
import { CameraService } from "./services/CameraService";
import { PlanService } from "./services/PlanService";
import { EntityService } from "./services/EntityService";

export interface PlanEntityStores {
    polesStore: PolesStore;
    tracksStore: TracksStore;
    fixingPointsStore: FixingPointsStore;
    anchorSectionsStore: AnchorSectionsStore;
    junctionsStore: JunctionsStore;
    vlPolesStore: VlPolesStore;
    wireLinesStore: WireLinesStore;
    crossSpansStore: CrossSpansStore;
    disconnectorsStore: DisconnectorsStore;
}

export interface Store extends PlanEntityStores {
    toolStateStore: ToolStateStore;
    selectionStore: SelectionStore;
    cameraStore: CameraStore;
    appStore: AppStore;
    plansStore: PlansStore;
    undoStackStore: UndoStackStore;
    uiPanelsStore: UIPanelsStore;
    inlineEditStore: InlineEditStore;
    displaySettingsStore: DisplaySettingsStore;
}

export interface Services {
    inputHandlerService: InputHandlerService;
    hitTestService: HitTestService;
    snapService: SnapService;
    cameraService: CameraService;
    planService: PlanService;
    entityService: EntityService;
}
