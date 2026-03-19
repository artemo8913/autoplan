//STORE
import { PolesStore } from "./store/PolesStore";
import { TracksStore } from "./store/TracksStore";
import { FixingPointsStore } from "./store/FixingPointsStore";
import { AnchorSectionsStore } from "./store/AnchorSectionsStore";
import { JunctionsStore } from "./store/JunctionsStore";
import { VlPolesStore } from "./store/VlPolesStore";
import { WireLinesStore } from "./store/WireLinesStore";
import { CrossSpansStore } from "./store/CrossSpansStore";
import { UIStore } from "./store/UIStore";
import { UndoStackStore } from "./store/UndoStackStore";
import { AppStore } from "./store/AppStore";
import { PlansStore } from "./store/PlansStore";

//SERVICE
import { SVGDrawer } from "./services/SvgDrawer";
import { InputHandlerService } from "./services/InputHandler";
import { HitTestService } from "./services/HitTestService";
import { SnapService } from "./services/SnapService";
import { MeasureService } from "./services/MeasureService";
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
    uiStore: UIStore;
    appStore: AppStore;
    plansStore: PlansStore;
    undoStackStore: UndoStackStore;
}

export interface Services {
    svgDrawer: SVGDrawer;
    inputHandlerService: InputHandlerService;
    hitTestService: HitTestService;
    snapService: SnapService;
    measureService: MeasureService;
    planService: PlanService;
}
