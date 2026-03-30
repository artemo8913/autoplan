import { type FC } from "react";
import { observer } from "mobx-react-lite";

import {
    CatenaryLayer,
    FixingPointsLayer,
    PoleLayer,
    SpanLengthLayer,
    TrackLayer,
    VlPoleLayer,
    WireLineLayer,
    ZigzagLayer,
} from "@/entities/catenaryPlanGraphic";
import { PoleEditorPanel } from "@/widgets/poleEditor";
import { TracksEditorPanel } from "@/widgets/tracksEditor";
import { LinesEditorPanel } from "@/widgets/linesEditor";
import { Toolbar } from "@/widgets/toolbar";
import { StatusBar } from "@/widgets/statusBar";
import { InlineEditOverlay } from "@/features/inlineEdit";
import { PlanHeader } from "@/widgets/planHeader";
import { PlansListPage } from "@/widgets/plansList";

import { StoreProvider } from "./StoreProvider";
import { ServicesProvider } from "./ServicesProvider";
import { InteractiveCanvas } from "./InteractiveCanvas";
import { useStore } from "../lib/storeContext";
import { useServices } from "../lib/servicesContext";
import type { Services, Store } from "../types";

import styles from "./App.module.css";

interface AppProps {
    services: Services;
    store: Store;
}

const AppContent: FC = observer(() => {
    const { appStore } = useStore();
    const { inputHandlerService } = useServices();

    if (appStore.currentView === "planslist") {
        return <PlansListPage />;
    }

    return (
        <div className={styles.layout}>
            <PlanHeader />
            <div className={styles.mainContainer}>
                <div className={styles.canvasContainer}>
                    <Toolbar />
                    <InteractiveCanvas inputHandlerService={inputHandlerService}>
                        <FixingPointsLayer />
                        <TrackLayer />
                        <VlPoleLayer />
                        <CatenaryLayer />
                        <PoleLayer />
                        <ZigzagLayer />
                        <SpanLengthLayer />
                        <WireLineLayer />
                    </InteractiveCanvas>
                    <StatusBar />
                    <InlineEditOverlay />
                </div>
                <PoleEditorPanel />
                <TracksEditorPanel />
                <LinesEditorPanel />
            </div>
        </div>
    );
});

AppContent.displayName = "AppContent";

const App: FC<AppProps> = ({ services, store }) => (
    <StoreProvider store={store}>
        <ServicesProvider services={services}>
            <AppContent />
        </ServicesProvider>
    </StoreProvider>
);

export { App };
