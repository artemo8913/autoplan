import { observer } from "mobx-react-lite";

import { counterStore } from "./store";
import { PoleLayer } from "./components/PoleLayer";

import "./App.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { TrackLayer } from "./components/TrackLayer";
import { Railway } from "./lib/Railway";
import { Track } from "./lib/Track";
import { Pole } from "./lib/Pole";

const raylway = new Railway({
    startX: 0,
    endX: 10000,
    name: "Малиногорка - Козулька"
});

const track1 = new Track({
    direction: "odd",
    startX: raylway.startX,
    endX: raylway.endX,
    name: "I",
    railwayMiddlePoses: raylway.globalPoses
});

const track2 = new Track({
    direction: "even",
    startX: raylway.startX,
    endX: raylway.endX,
    name: "II",
    railwayMiddlePoses: raylway.globalPoses
});

const poles: Pole[] = [
    ...new Array(20).fill(null).map((_, i) => new Pole({
        x: 100 * i,
        name: `${2 * (i + 1)}`,
        tracks: {
            [track2.id]: {
                gabarit: 3.1,
                relativePositionToTrack: "right",
                track: track2
            }
        }
    })),
    ...new Array(20).fill(null).map((_, i) => new Pole({
        x: 100 * i,
        name: `${2 * (i + 1)}`,
        tracks: {
            [track1.id]: {
                gabarit: 3.1,
                relativePositionToTrack: "right",
                track: track1
            }
        }
    })),
];
const App = observer(() => {
    const svgRef = useRef(null);
    const containerRef = useRef(null);
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0, vx: 0, vy: 0 });
    const [containerSize, setContainerSize] = useState({ w: 1200, h: 600 });
    const [viewBox, setViewBox] = useState({
        x: 0, y: 0, w: 2400, h: 500,
    });

    // Scale
    const totalMeters = 48000 - 45000;
    const scaleX = viewBox.w / totalMeters;
    const scaleY = 12; // pixels per meter of Y offset
    const centerY = viewBox.h / 2;

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

    // Pan
    const handleMouseDown = useCallback((e) => {
        if (e.target.closest(".pole-symbol")) return;
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
        <>
            <div
                ref={containerRef}
                style={{
                    height: "600px", overflow: "hidden",
                    background: "green", position: "relative",
                    fontFamily: "'JetBrains Mono', monospace",
                }}
            >
                <h2>Counter: {counterStore.count}</h2>
                <button onClick={() => counterStore.increment()}>Increment</button>
                <button onClick={() => counterStore.decrement()}>Decrement</button>
                <svg
                    ref={svgRef}
                    viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
                    style={{
                        width: "100%", height: "100%", paddingTop: 48,
                        cursor: isPanning ? "grabbing" : "grab",
                    }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onWheel={handleWheel}
                >
                    <TrackLayer tracks={[track2, track1]} />
                    <PoleLayer poles={poles} />
                </svg>
            </div>
        </>
    );
});

export default App;
