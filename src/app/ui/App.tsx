import { type FC, useEffect, useRef, useState } from "react";
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
import { TracksEditorPanel } from "@/widgets/tracksEditor";
import { LinesEditorPanel } from "@/widgets/linesEditor";
import { JunctionsEditorPanel } from "@/widgets/junctionsEditor";
import { Toolbar } from "@/widgets/toolbar";
import { StatusBar } from "@/widgets/statusBar";
import { InlineEditOverlay } from "@/features/inlineEdit";
import { PlanHeader } from "@/widgets/planHeader";
import { PlansListPage } from "@/widgets/plansList";
import { BulkPolesModal } from "@/features/bulkPolesEditor";

import { StoreProvider } from "./StoreProvider";
import { ServicesProvider } from "./ServicesProvider";
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

    const planSVGRef = useRef<SVGGElement>(null);
    const [planSVGElement, setPlanSVGElement] = useState<SVGGElement | null>(null);

    useEffect(() => {
        if (planSVGRef.current !== planSVGElement) {
            setPlanSVGElement(planSVGRef.current);
        }
    });

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
                            <g ref={planSVGRef}>
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
                            </g>
                            {planSVGElement && <PoleDataTableLayer planSVG={planSVGElement} />}
                        </InteractiveCanvas>
                        <InlineEditOverlay />
                    </div>
                    <StatusBar />
                </div>
                <PoleEditorPanel />
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
            <AppContent />
        </ServicesProvider>
    </StoreProvider>
);

export { App };
