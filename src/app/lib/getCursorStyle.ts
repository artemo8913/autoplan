import type { ToolState } from "../store/ToolStateStore";

export function getCursorStyle(toolState: ToolState): string {
    switch (toolState.tool) {
        case "panTool":
            return "grab";
        case "idle":
            return "pointer";
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
        default:
            return "default";
    }
}
