// ============================================================================
// InteractiveCanvas — SVG-обёртка с подключённым InputHandler
// ============================================================================
//
// Управляет жизненным циклом InputHandler (mount/unmount/setSvgElement).
// Берёт viewBox из UIStore.
// Рендерит children (слои плана) и overlay-слои поверх.
//
// Overlay-слои добавляются по мере реализации шагов:
//   Шаг 3: SelectionHighlightLayer, SelectionRect
//   Шаг 4: PlacementPreview
// ============================================================================

import { type FC, type PropsWithChildren, useEffect, useRef } from "react";
import { observer } from "mobx-react-lite";

import { SelectionRect } from "@/features/selectionRect";
import { PlacementPreview } from "@/features/placementPreview";

import { useStore } from "../lib/storeContext";
import { getCursorStyle } from "../lib/getCursorStyle";
import type { InputHandlerService } from "../services/InputHandler";

import styles from "./InteractiveCanvas.module.css";

interface InteractiveCanvasProps {
    inputHandlerService: InputHandlerService;
}

const InteractiveCanvasBase: FC<PropsWithChildren<InteractiveCanvasProps>> = ({ inputHandlerService, children }) => {
    const { toolStateStore, cameraStore } = useStore();
    const svgRef = useRef<SVGSVGElement>(null);

    // Подключаем InputHandler к SVG-элементу и глобальным событиям
    useEffect(() => {
        inputHandlerService.setSvgElement(svgRef.current);
        inputHandlerService.mount();

        const el = svgRef.current;
        if (el) {
            // wheel нужно добавлять вручную с passive:false чтобы preventDefault работал
            el.addEventListener("wheel", inputHandlerService.onWheel, { passive: false });
            el.addEventListener("contextmenu", (e) => e.preventDefault());
        }

        return () => {
            inputHandlerService.unmount();
            inputHandlerService.setSvgElement(null);
            if (el) {
                el.removeEventListener("wheel", inputHandlerService.onWheel);
            }
        };
    }, [inputHandlerService]);

    const { x, y, width, height } = cameraStore.viewBox;

    return (
        <svg
            ref={svgRef}
            viewBox={`${x} ${y} ${width} ${height}`}
            className={styles.canvas}
            data-cursor={getCursorStyle(toolStateStore.toolState, toolStateStore.hoveredEntity?.id ?? null)}
            onMouseDown={inputHandlerService.onMouseDown}
            onMouseMove={inputHandlerService.onMouseMove}
            onMouseUp={inputHandlerService.onMouseUp}
            onMouseLeave={inputHandlerService.onMouseLeave}
        >
            {children}
            <PlacementPreview />
            <SelectionRect />
        </svg>
    );
};

export const InteractiveCanvas = observer(InteractiveCanvasBase);
