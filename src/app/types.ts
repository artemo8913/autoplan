//STORE
import { CatenaryPoleStore } from "./store/CatenaryPoleStore";
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
import { SaveStatusStore } from "./store/SaveStatusStore";
import { ConfirmDialogStore } from "./store/ConfirmDialogStore";

//SERVICE
import { InputHandlerService } from "./services/InputHandler";
import { HitTestService } from "./services/HitTestService";
import { SnapService } from "./services/SnapService";
import { CameraService } from "./services/CameraService";
import { PlanService } from "./services/PlanService";
import { DragService } from "./services/DragService";
import { EntityService } from "./services/EntityService";
import { InlineEditService } from "./services/InlineEditService";
import { EditService } from "./services/EditService";
import { LinesService } from "./services/LinesService";
import { JunctionService } from "./services/JunctionService";
import { TrackService } from "./services/TrackService";
import type { NotificationService } from "./services/NotificationService";

export interface PlanEntityStores {
    catenaryPoleStore: CatenaryPoleStore;
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
    saveStatusStore: SaveStatusStore;
    confirmDialogStore: ConfirmDialogStore;
}

export interface Services {
    inputHandlerService: InputHandlerService;
    hitTestService: HitTestService;
    snapService: SnapService;
    cameraService: CameraService;
    planService: PlanService;
    entityService: EntityService;
    dragService: DragService;
    inlineEditService: InlineEditService;
    editService: EditService;
    linesService: LinesService;
    junctionService: JunctionService;
    trackService: TrackService;
    notificationService: NotificationService;
}
