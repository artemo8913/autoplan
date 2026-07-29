import { describe, it, expect } from "vitest";

import { formatDate } from "./formatDate";

describe("formatDate", () => {
    it("форматирует ISO в ru-RU дд.мм.гггг, чч:мм", () => {
        const out = formatDate("2026-06-15T12:00:00.000Z");
        // \s покрывает и обычный пробел, и узкий неразрывный (U+202F) из новых ICU
        expect(out).toMatch(/^\d{2}\.\d{2}\.\d{4},?\s+\d{2}:\d{2}$/);
        expect(out).toContain("2026");
    });

    it("детерминирован для одного и того же входа", () => {
        const iso = "2026-01-02T08:30:00.000Z";
        expect(formatDate(iso)).toBe(formatDate(iso));
    });
});
