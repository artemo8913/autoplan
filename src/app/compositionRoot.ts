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

//SERVICE
import { SVGDrawer } from "./services/SvgDrawer";
import { InputHandler } from "./services/InputHandler";
import { EntityService } from "./services/EntityService";
import { HitTestService } from "./services/HitTestService";
import { SnapService } from "./services/SnapService";
import { MeasureService } from "./services/MeasureService";

//MOCK. Удалить потом
import { createTestData } from "./initMock";

export function init(): { services: Services; store: Store; inputHandler: InputHandler } {
    const svgDrawer = new SVGDrawer();
    const data = createTestData();

    const uiStore = new UIStore();
    const anchorSectionsStore = new AnchorSectionsStore(data.anchorSections);
    const tracksStore = new TracksStore(data.tracks, data.railway);
    const polesStore = new PolesStore(data.poles);
    const vlPolesStore = new VlPolesStore(data.vlPoles);
    const fixingPointsStore = new FixingPointsStore(data.fixingPoints);
    const wireLinesStore = new WireLinesStore(data.wireLines);
    const junctionsStore = new JunctionsStore(data.junctions);
    const crossSpansStore = new CrossSpansStore([]);
    const undoStackStore = new UndoStackStore();

    const hitTestService = new HitTestService({
        polesStore,
        vlPolesStore,
        wireLinesStore,
        fixingPointsStore,
    });
    const measureService = new MeasureService();
    const snapService = new SnapService({ tracksStore }, measureService);
    const entityService = new EntityService(polesStore, vlPolesStore, tracksStore, undoStackStore);

    const inputHandler = new InputHandler(uiStore, hitTestService, snapService, entityService, undoStackStore);

    return {
        inputHandler,
        services: {
            svgDrawer,
            snapService,
            inputHandler,
            hitTestService,
            measureService,
        },
        store: {
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
        }
    };
}
