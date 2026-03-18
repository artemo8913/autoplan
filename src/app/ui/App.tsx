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
import { InfrastructurePanel } from "@/widgets/infrastructurePanel";
import { Toolbar } from "@/widgets/toolbar";
import { StatusBar } from "@/widgets/statusBar";
import { PlanHeader } from "@/widgets/planHeader";
import { PlansListPage } from "@/widgets/plansList";

import { StoreProvider } from "./StoreProvider";
import { ServicesProvider } from "./ServicesProvider";
import { InteractiveCanvas } from "./InteractiveCanvas";
import { useStore } from "../lib/storeContext";
import type { InputHandler } from "../services/InputHandler";
import type { Services, Store } from "../types";

import styles from "./App.module.css";

interface AppProps {
    services: Services;
    store: Store;
    inputHandler: InputHandler;
}

const AppContent: FC<{ inputHandler: InputHandler }> = observer(({ inputHandler }) => {
    const { appStore } = useStore();

    if (appStore.currentView === "planslist") {
        return <PlansListPage />;
    }

    return (
        <div className={styles.layout}>
            <PlanHeader />
            <div className={styles.mainContainer}>
                <div className={styles.canvasContainer}>
                    <Toolbar />
                    <InteractiveCanvas inputHandler={inputHandler}>
                        <FixingPointsLayer />
                        <TrackLayer />
                        <VlPoleLayer />
                        <PoleLayer />
                        <CatenaryLayer />
                        <ZigzagLayer />
                        <SpanLengthLayer />
                        <WireLineLayer />
                    </InteractiveCanvas>
                    <StatusBar />
                </div>
                <PoleEditorPanel />
                <InfrastructurePanel />
            </div>
        </div>
    );
});

AppContent.displayName = "AppContent";

const App: FC<AppProps> = ({ services, store, inputHandler }) => (
    <StoreProvider store={store}>
        <ServicesProvider services={services}>
            <AppContent inputHandler={inputHandler} />
        </ServicesProvider>
    </StoreProvider>
);

export { App };
