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

//SERVICE
import { SVGDrawer } from "./services/SvgDrawer";
import { InputHandler } from "./services/InputHandler";
import { HitTestService } from "./services/HitTestService";
import { SnapService } from "./services/SnapService";
import { MeasureService } from "./services/MeasureService";

export interface Store {
    uiStore: UIStore;
    polesStore: PolesStore;
    tracksStore: TracksStore;
    fixingPointsStore: FixingPointsStore;
    anchorSectionsStore: AnchorSectionsStore;
    junctionsStore: JunctionsStore;
    vlPolesStore: VlPolesStore;
    wireLinesStore: WireLinesStore;
    crossSpansStore: CrossSpansStore;
    undoStackStore: UndoStackStore;
}

export interface Services {
    svgDrawer: SVGDrawer;
    inputHandler: InputHandler;
    hitTestService: HitTestService;
    snapService: SnapService;
    measureService: MeasureService;
}