import { describe, it, expect } from "vitest";

import { JUNCTION_TYPE_DATA } from "./selectOptions";

describe("JUNCTION_TYPE_DATA", () => {
    it("содержит оба типа сопряжения с подписями", () => {
        expect(JUNCTION_TYPE_DATA).toEqual([
            { value: "non-insulating", label: "Неизол." },
            { value: "insulating", label: "Изол." },
        ]);
    });
});
