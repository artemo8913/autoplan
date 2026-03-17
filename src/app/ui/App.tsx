import { type FC } from "react";

import {
    CatenaryLayer,
    FixingPointsLayer,
    PoleLayer,
    SpanLengthLayer,
    TrackLayer,
    VlPoleLayer,
    WireLineLayer,
    ZigzagLayer
} from "@/entities/catenaryPlanGraphic";
import { PoleEditorPanel } from "@/features/poleEditor";
import { InfrastructurePanel } from "@/features/infrastructurePanel";
import { Toolbar } from "@/features/toolbar";
import { StatusBar } from "@/features/statusBar";

import { StoreProvider } from "./StoreProvider";
import { ServicesProvider } from "./ServicesProvider";
import { InteractiveCanvas } from "./InteractiveCanvas";
import type { InputHandler } from "../services/InputHandler";
import type { Services, Store } from "../types";

import styles from "./App.module.css";

interface AppProps {
    services: Services;
    store: Store;
    inputHandler: InputHandler;
}

const App: FC<AppProps> = ({ services, store, inputHandler }) => (
    <StoreProvider store={store}>
        <ServicesProvider services={services}>
            <div className={styles.layout}>
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
        </ServicesProvider>
    </StoreProvider>
);

export { App };
