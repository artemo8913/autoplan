import { Railway } from "@/entities/catenaryPlanGraphic";

//TYPES
import type { Services, Store } from "./types";
//STORE
import { PolesStore } from "./store/PolesStore";
import { TracksStore } from "./store/TracksStore";
import { FixingPointsStore } from "./store/FixingPointsStore";
import { AnchorSectionsStore } from "./store/AnchorSectionsStore";
import { JunctionsStore } from "./store/JunctionsStore";
import { VlPolesStore } from "./store/VlPolesStore";
import { WireLinesStore } from "./store/WireLinesStore";
import { CrossSpansStore } from "./store/CrossSpansStore";
import { UndoStackStore } from "./store/UndoStackStore";
import { UIStore } from "./store/UIStore";
import { AppStore } from "./store/AppStore";
import { PlansStore } from "./store/PlansStore";

//SERVICE
import { SVGDrawer } from "./services/SvgDrawer";
import { MeasureService } from "./services/MeasureService";
import { InputHandlerService } from "./services/InputHandler";
import { EntityService } from "./services/EntityService";
import { HitTestService } from "./services/HitTestService";
import { SnapService } from "./services/SnapService";
import { PlanSerializationService } from "./services/PlanSerializationService";
import { LocalStorageService } from "./services/LocalStorageService";
import { PlanService } from "./services/PlanService";

export function init(): { services: Services; store: Store } {
    //STORES
    const uiStore = new UIStore();
    const plansStore = new PlansStore();
    const appStore = new AppStore(plansStore);
    const undoStackStore = new UndoStackStore();

    // Entity-сторы с пустыми данными (будут заполнены при открытии плана)
    const dummyRailway = new Railway({ name: "", startX: 0, endX: 10000 });
    const polesStore = new PolesStore([]);
    const tracksStore = new TracksStore([], dummyRailway);
    const vlPolesStore = new VlPolesStore([]);
    const wireLinesStore = new WireLinesStore([]);
    const junctionsStore = new JunctionsStore([]);
    const crossSpansStore = new CrossSpansStore([]);
    const fixingPointsStore = new FixingPointsStore([]);
    const anchorSectionsStore = new AnchorSectionsStore([]);

    //SERVICES
    const svgDrawer = new SVGDrawer();
    const serializationService = new PlanSerializationService();
    const localStorageService = new LocalStorageService();
    const planService = new PlanService(appStore, plansStore, serializationService, localStorageService, {
        polesStore,
        tracksStore,
        vlPolesStore,
        junctionsStore,
        wireLinesStore,
        crossSpansStore,
        fixingPointsStore,
        anchorSectionsStore,
    });
    const hitTestService = new HitTestService({
        polesStore,
        vlPolesStore,
        wireLinesStore,
        fixingPointsStore,
    });
    const measureService = new MeasureService();
    const snapService = new SnapService({ tracksStore }, measureService);
    const entityService = new EntityService(polesStore, vlPolesStore, tracksStore, undoStackStore);
    const inputHandlerService = new InputHandlerService(
        uiStore,
        hitTestService,
        snapService,
        entityService,
        undoStackStore,
    );

    //INIT. Load data from localStorage
    const savedList = localStorageService.loadList();
    for (const meta of savedList) {
        plansStore.add(meta);
    }

    return {
        services: {
            svgDrawer,
            snapService,
            inputHandlerService,
            hitTestService,
            measureService,
            planService,
        },
        store: {
            appStore,
            plansStore,
            uiStore,
            polesStore,
            tracksStore,
            vlPolesStore,
            wireLinesStore,
            undoStackStore,
            junctionsStore,
            crossSpansStore,
            fixingPointsStore,
            anchorSectionsStore,
        },
    };
}
