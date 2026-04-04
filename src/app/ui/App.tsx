import { type FC, useEffect, useRef, useState } from "react";
import { observer } from "mobx-react-lite";

import {
    CatenaryLayer,
    CrossSpanLayer,
    DisconnectorLayer,
    FixingPointsLayer,
    PoleDataTableLayer,
    PoleLayer,
    SpanLengthLayer,
    TrackLayer,
    VlPoleLayer,
    WireLineLayer,
    ZigzagLayer,
    type PlanBBox,
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

    const planGroupRef = useRef<SVGGElement>(null);
    const [planBBox, setPlanBBox] = useState<PlanBBox | null>(null);

    useEffect(() => {
        const el = planGroupRef.current;
        if (!el) {
            return;
        }

        const updateBBox = () => {
            const bbox = el.getBBox();
            if (bbox.height > 0) {
                const newMinY = bbox.y;
                const newMaxY = bbox.y + bbox.height;
                setPlanBBox((prev) => {
                    if (prev && prev.minY === newMinY && prev.maxY === newMaxY) {
                        return prev;
                    }
                    return { minY: newMinY, maxY: newMaxY };
                });
            }
        };

        updateBBox();

        const observer = new MutationObserver(updateBBox);
        observer.observe(el, { childList: true, subtree: true, attributes: true });

        return () => observer.disconnect();
    }, []);

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
                            <g ref={planGroupRef}>
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
                            {planBBox && <PoleDataTableLayer planBBox={planBBox} />}
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
