import { autorun } from "mobx";
import { Railway } from "@/entities/catenaryPlanGraphic";

//TYPES
import type { PlanEntityStores, Services, Store } from "./types";
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
import { UndoStackStore } from "./store/UndoStackStore";
import { ToolStateStore } from "./store/ToolStateStore";
import { CameraStore } from "./store/CameraStore";
import { SelectionStore } from "./store/SelectionStore";
import { AppStore } from "./store/AppStore";
import { PlansStore } from "./store/PlansStore";
import { UIPanelsStore } from "./store/UIPanelsStore";
import { InlineEditStore } from "./store/InlineEditStore";
import { DisplaySettingsStore } from "./store/DisplaySettingsStore";
import { SaveStatusStore } from "./store/SaveStatusStore";
import { ConfirmDialogStore } from "./store/ConfirmDialogStore";

//SERVICE
import { InputHandlerService } from "./services/InputHandler";
import { EntityService } from "./services/EntityService";
import { DragService } from "./services/DragService";
import { InlineEditService } from "./services/InlineEditService";
import { HitTestService } from "./services/HitTestService";
import { SnapService } from "./services/SnapService";
import { CameraService } from "./services/CameraService";
import { PlacementToolService } from "./services/PlacementToolService";
import { CrossSpanToolService } from "./services/CrossSpanToolService";
import { SelectionToolService } from "./services/SelectionToolService";
import { PlanSerializationService } from "./services/PlanSerializationService";
import { PlanService } from "./services/PlanService";
import { EditService } from "./services/EditService";
import { LinesService } from "./services/LinesService";
import { JunctionService } from "./services/JunctionService";
import { TrackService } from "./services/TrackService";
import { MantineNotificationService } from "./services/MantineNotificationService";

export function init(): { services: Services; store: Store } {
    //STORES
    const toolStateStore = new ToolStateStore();
    const selectionStore = new SelectionStore();
    const cameraStore = new CameraStore();
    const plansStore = new PlansStore();
    const appStore = new AppStore(plansStore);
    const undoStackStore = new UndoStackStore();
    const uiPanelsStore = new UIPanelsStore();
    const inlineEditStore = new InlineEditStore();
    const displaySettingsStore = new DisplaySettingsStore();
    const saveStatusStore = new SaveStatusStore();
    const confirmDialogStore = new ConfirmDialogStore();

    // Entity-сторы с пустыми данными (будут заполнены при открытии плана)
    const dummyRailway = new Railway({ name: "", startX: 0, endX: 10000 });
    const catenaryPoleStore = new CatenaryPoleStore([]);
    const tracksStore = new TracksStore([], dummyRailway);
    const vlPolesStore = new VlPolesStore([]);
    const wireLinesStore = new WireLinesStore([]);
    const junctionsStore = new JunctionsStore([]);
    const crossSpansStore = new CrossSpansStore([]);
    const disconnectorsStore = new DisconnectorsStore([]);
    const fixingPointsStore = new FixingPointsStore([]);
    const anchorSectionsStore = new AnchorSectionsStore([]);

    /** Все entity-сторы одним объектом: сервисы правок и каскад работают с ним целиком. */
    const planEntityStores: PlanEntityStores = {
        catenaryPoleStore,
        tracksStore,
        vlPolesStore,
        junctionsStore,
        wireLinesStore,
        crossSpansStore,
        disconnectorsStore,
        fixingPointsStore,
        anchorSectionsStore,
    };

    //SERVICES
    const notificationService = new MantineNotificationService();
    const cameraService = new CameraService(cameraStore, toolStateStore);
    const serializationService = new PlanSerializationService();
    const planService = new PlanService(
        appStore,
        plansStore,
        serializationService,
        cameraStore,
        planEntityStores,
        undoStackStore,
        saveStatusStore,
        notificationService,
    );
    const hitTestService = new HitTestService(
        catenaryPoleStore,
        vlPolesStore,
        fixingPointsStore,
        wireLinesStore,
        anchorSectionsStore,
        junctionsStore,
        crossSpansStore,
        disconnectorsStore,
        displaySettingsStore,
    );
    const snapService = new SnapService(tracksStore);
    const entityService = new EntityService(planEntityStores, undoStackStore, notificationService);
    const editService = new EditService(undoStackStore, tracksStore);
    const linesService = new LinesService(planEntityStores, undoStackStore);
    const junctionService = new JunctionService(planEntityStores, undoStackStore, notificationService);
    const trackService = new TrackService(planEntityStores, undoStackStore);
    const dragService = new DragService(catenaryPoleStore, vlPolesStore, undoStackStore, toolStateStore);
    const inlineEditService = new InlineEditService(
        catenaryPoleStore,
        fixingPointsStore,
        undoStackStore,
        inlineEditStore,
        hitTestService,
    );
    const placementToolService = new PlacementToolService(
        toolStateStore,
        entityService,
        snapService,
        hitTestService,
        notificationService,
    );
    const crossSpanToolService = new CrossSpanToolService(
        toolStateStore,
        entityService,
        hitTestService,
        notificationService,
    );
    const selectionToolService = new SelectionToolService(
        toolStateStore,
        selectionStore,
        hitTestService,
        uiPanelsStore,
    );
    const inputHandlerService = new InputHandlerService(
        toolStateStore,
        cameraService,
        undoStackStore,
        inlineEditService,
        placementToolService,
        crossSpanToolService,
        selectionToolService,
        entityService,
        dragService,
        confirmDialogStore,
    );

    autorun(() => displaySettingsStore.saveToStorage());

    // Автосохранение: подписка на команды undo-стека (см. PlanService.startAutosave).
    planService.startAutosave();

    // Уход со страницы не должен съесть отложенную запись.
    if (typeof window !== "undefined") {
        window.addEventListener("beforeunload", () => planService.flushAutosave());
    }

    //INIT. Load data from storage
    const loadedPlanList = planService.loadPlanListFromStorage();
    for (const meta of loadedPlanList) {
        plansStore.add(meta);
    }

    return {
        services: {
            cameraService,
            snapService,
            inputHandlerService,
            hitTestService,
            planService,
            entityService,
            editService,
            linesService,
            junctionService,
            trackService,
            dragService,
            inlineEditService,
            notificationService,
        },
        store: {
            appStore,
            plansStore,
            toolStateStore,
            selectionStore,
            cameraStore,
            catenaryPoleStore,
            tracksStore,
            vlPolesStore,
            wireLinesStore,
            undoStackStore,
            junctionsStore,
            crossSpansStore,
            disconnectorsStore,
            fixingPointsStore,
            anchorSectionsStore,
            uiPanelsStore,
            inlineEditStore,
            displaySettingsStore,
            saveStatusStore,
            confirmDialogStore,
        },
    };
}
