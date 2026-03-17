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

import { useStore } from "./storeContext";
import type { InputHandler } from "../services/InputHandler";
import { getCursorStyle } from "./getCursorStyle";

import styles from "./InteractiveCanvas.module.css";

interface InteractiveCanvasProps {
    inputHandler: InputHandler;
}

const InteractiveCanvasBase: FC<PropsWithChildren<InteractiveCanvasProps>> = ({ inputHandler, children }) => {
    const { uiStore } = useStore();
    const svgRef = useRef<SVGSVGElement>(null);

    // Подключаем InputHandler к SVG-элементу и глобальным событиям
    useEffect(() => {
        inputHandler.setSvgElement(svgRef.current);
        inputHandler.mount();

        const el = svgRef.current;
        if (el) {
            // wheel нужно добавлять вручную с passive:false чтобы preventDefault работал
            el.addEventListener("wheel", inputHandler.onWheel, { passive: false });
            el.addEventListener("contextmenu", (e) => e.preventDefault());
        }

        return () => {
            inputHandler.unmount();
            inputHandler.setSvgElement(null);
            if (el) {
                el.removeEventListener("wheel", inputHandler.onWheel);
            }
        };
    }, [inputHandler]);

    const { x, y, width, height } = uiStore.viewBox;

    return (
        <svg
            ref={svgRef}
            viewBox={`${x} ${y} ${width} ${height}`}
            className={styles.canvas}
            data-cursor={getCursorStyle(uiStore.toolState, uiStore.isSpaceHeld, uiStore.hoveredEntityId)}
            onMouseDown={inputHandler.onMouseDown}
            onMouseMove={inputHandler.onMouseMove}
            onMouseUp={inputHandler.onMouseUp}
            onMouseLeave={inputHandler.onMouseLeave}
        >
            {children}
            <PlacementPreview />
            <SelectionRect />
        </svg>
    );
};

export const InteractiveCanvas = observer(InteractiveCanvasBase);
