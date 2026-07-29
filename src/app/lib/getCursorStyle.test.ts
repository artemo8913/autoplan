import { describe, it, expect } from "vitest";

import type { ToolState } from "../store/ToolStateStore";
import { getCursorStyle } from "./getCursorStyle";

// getCursorStyle читает только .tool — достаточно заглушки.
const ts = (tool: string) => ({ tool }) as unknown as ToolState;

describe("getCursorStyle", () => {
    it.each([
        ["panTool", "grab"],
        ["idle", "pointer"],
        ["dragPan", "grabbing"],
        ["placement", "crosshair"],
        ["multiSelect", "crosshair"],
        ["crossSpan", "pointer"],
    ])("инструмент %s → курсор %s", (tool, cursor) => {
        expect(getCursorStyle(ts(tool))).toBe(cursor);
    });

    it("неизвестный/прочий инструмент → default", () => {
        expect(getCursorStyle(ts("dragEntities"))).toBe("default");
    });
});
