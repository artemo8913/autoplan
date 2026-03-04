import { observer } from "mobx-react-lite";
import { useCallback, useEffect, useRef, useState, type FC } from "react";

import { PoleLayer } from "@/entities/catenaryPlanGraphic/PoleLayer";
import { TrackLayer } from "@/entities/catenaryPlanGraphic/TrackLayer";
import { CatenaryLayer } from "@/entities/catenaryPlanGraphic/CatenaryLayer";
import { AttachmentsLayer } from "@/entities/catenaryPlanGraphic/AttachmentsLayer";
import { ZigzagLayer } from "@/entities/catenaryPlanGraphic/ZigzagLayer";
import { SpanLengthLayer } from "@/entities/catenaryPlanGraphic/SpanLengthLayer";
import { PoleEditorPanel } from "@/features/poleEditor";

import { ServicesProvider, type Services } from "./services";
import { StoreProvider, type Store } from "./store";

import "./style/index.css";

interface AppProps {
    services: Services;
    store: Store;
}

const Plan = observer(() => {
    const svgRef = useRef(null);
    const containerRef = useRef(null);
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0, vx: 0, vy: 0 });
    const [containerSize, setContainerSize] = useState({ w: 1200, h: 600 });
    const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 2400, h: 500 });

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const obs = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setContainerSize({ w: entry.contentRect.width, h: entry.contentRect.height });
            }
        });
        obs.observe(el);
        return () => obs.disconnect();
    }, []);

    const handleMouseDown = useCallback((e) => {
        if (e.target.closest(".pole-clickable")) return;
        setIsPanning(true);
        setPanStart({ x: e.clientX, y: e.clientY, vx: viewBox.x, vy: viewBox.y });
    }, [viewBox]);

    const handleMouseMove = useCallback((e) => {
        if (!isPanning) return;
        const dx = (e.clientX - panStart.x) * (viewBox.w / containerSize.w);
        const dy = (e.clientY - panStart.y) * (viewBox.h / containerSize.h);
        setViewBox((v) => ({ ...v, x: panStart.vx - dx, y: panStart.vy - dy }));
    }, [isPanning, panStart, viewBox.w, viewBox.h, containerSize]);

    const handleMouseUp = useCallback(() => setIsPanning(false), []);

    const handleWheel = useCallback((e) => {
        e.preventDefault();
        const factor = e.deltaY > 0 ? 1.1 : 0.9;
        const svgRect = svgRef.current?.getBoundingClientRect();
        if (!svgRect) return;
        const mx = ((e.clientX - svgRect.left) / svgRect.width) * viewBox.w + viewBox.x;
        const my = ((e.clientY - svgRect.top) / svgRect.height) * viewBox.h + viewBox.y;
        setViewBox((v) => {
            const nw = v.w * factor;
            const nh = v.h * factor;
            return {
                x: mx - (mx - v.x) * factor,
                y: my - (my - v.y) * factor,
                w: Math.max(200, Math.min(20000, nw)),
                h: Math.max(100, Math.min(5000, nh)),
            };
        });
    }, [viewBox]);

    return (
        <div className="app-layout">
            <div
                ref={containerRef}
                className="app-canvas-container"
            >
                <svg
                    ref={svgRef}
                    viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
                    className={`app-svg ${isPanning ? "panning" : ""}`}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onWheel={handleWheel}
                >
                    <AttachmentsLayer />
                    <TrackLayer />
                    <PoleLayer />
                    <CatenaryLayer />
                    <ZigzagLayer />
                    <SpanLengthLayer />
                </svg>
            </div>

            <PoleEditorPanel />
        </div>
    );
});

const App: FC<AppProps> = ({ services, store }) => (
    <StoreProvider store={store}>
        <ServicesProvider services={services}>
            <Plan />
        </ServicesProvider>
    </StoreProvider>
);

export default App;
