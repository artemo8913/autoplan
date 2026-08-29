import { type FC } from "react";
import { observer } from "mobx-react-lite";

import {
    CatenaryLayer,
    CrossSpanLayer,
    DisconnectorLayer,
    FixingPointsLayer,
    KmPkScaleLayer,
    PoleDataTableLayer,
    PoleLayer,
    SpanLengthLayer,
    TrackLayer,
    VlPoleLayer,
    WireLineLayer,
    ZigzagLayer,
} from "@/entities/catenaryPlanGraphic";
import { PoleEditorPanel } from "@/widgets/poleEditor";
import { CrossSpanEditorPanel } from "@/widgets/crossSpanEditor";
import { TracksEditorPanel } from "@/widgets/tracksEditor";
import { LinesEditorPanel } from "@/widgets/linesEditor";
import { JunctionsEditorPanel } from "@/widgets/junctionsEditor";
import { Toolbar } from "@/widgets/toolbar";
import { StatusBar } from "@/widgets/statusBar";
import { InlineEditOverlay } from "@/features/inlineEdit";
import { PlanHeader } from "@/widgets/planHeader";
import { PlansListPage } from "@/widgets/plansList";
import { BulkPolesModal } from "@/features/bulkPolesEditor";
import { ConfirmDialog } from "@/widgets/confirmDialog";
import { ContextMenu } from "@/widgets/contextMenu";

import { StoreProvider } from "./StoreProvider";
import { ServicesProvider } from "./ServicesProvider";
import { AppErrorBoundary } from "./ErrorBoundary";
import { InteractiveCanvas } from "./InteractiveCanvas";
import { useStore } from "../lib/storeContext";
import type { Services, Store } from "../types";

import styles from "./App.module.css";

interface AppProps {
    services: Services;
    store: Store;
}

const AppContent: FC = observer(() => {
    const { appStore } = useStore();

    if (appStore.currentView === "planslist") {
        return <PlansListPage />;
    }

    return (
        <div className={styles.layout}>
            <PlanHeader />
            <div className={styles.mainContainer}>
                <div className={styles.canvasContainer}>
                    <div className={styles.canvasArea}>
                        <Toolbar />
                        <InteractiveCanvas>
                            <g>
                                <KmPkScaleLayer />
                                <FixingPointsLayer />
                                <TrackLayer />
                                <VlPoleLayer />
                                <CatenaryLayer />
                                <CrossSpanLayer />
                                <PoleLayer />
                                <DisconnectorLayer />
                                <ZigzagLayer />
                                <SpanLengthLayer />
                                <WireLineLayer />
                                <PoleDataTableLayer />
                            </g>
                        </InteractiveCanvas>
                        <InlineEditOverlay />
                        <ContextMenu />
                    </div>
                    <StatusBar />
                </div>
                <PoleEditorPanel />
                <CrossSpanEditorPanel />
                <TracksEditorPanel />
                <LinesEditorPanel />
                <JunctionsEditorPanel />
                <BulkPolesModal />
            </div>
        </div>
    );
});

AppContent.displayName = "AppContent";

const App: FC<AppProps> = ({ services, store }) => (
    <StoreProvider store={store}>
        <ServicesProvider services={services}>
            <AppErrorBoundary>
                <AppContent />
                <ConfirmDialog />
            </AppErrorBoundary>
        </ServicesProvider>
    </StoreProvider>
);

export { App };
