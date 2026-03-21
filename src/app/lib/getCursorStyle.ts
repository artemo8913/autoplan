import type { ToolState } from "../store/ToolStateStore";

export function getCursorStyle(toolState: ToolState, hoveredEntityId: string | null): string {
    switch (toolState.tool) {
        case "panTool":
            return "grab";
        case "idle":
            return hoveredEntityId ? "pointer" : "default";
        case "selection":
            if (toolState.isDragging) {
                return "grabbing";
            }
            return hoveredEntityId ? "pointer" : "default";
        case "dragPan":
            return "grabbing";
        case "placement":
            return "crosshair";
        case "multiSelect":
            return "crosshair";
        case "wireDrawing":
            return "crosshair";
        case "crossSpan":
            return "pointer";
    }
}
