import { describe, it, expect } from "vitest";

import { CatenaryPole } from "./CatenaryPole";
import { CrossSpan } from "./CrossSpan";

const a = new CatenaryPole({ x: 0, name: "a", tracks: {} });
const b = new CatenaryPole({ x: 100, name: "b", tracks: {} });

describe("CrossSpan", () => {
    it("хранит тип и опоры, использует переданный id", () => {
        const cs = new CrossSpan({ id: "cs1", spanType: "rigid", poleA: a, poleB: b });
        expect(cs).toMatchObject({ id: "cs1", spanType: "rigid", poleA: a, poleB: b });
    });

    it("генерирует id, если не задан", () => {
        expect(new CrossSpan({ spanType: "flexible", poleA: a, poleB: b }).id).toBeTruthy();
    });
});
