import type { Pos } from "@/shared/types/catenaryTypes";
import type { EntityType, ViewBox } from "@/shared/types/toolTypes";

import type { PolesStore } from "../store/PolesStore";
import type { VlPolesStore } from "../store/VlPolesStore";
import type { FixingPointsStore } from "../store/FixingPointsStore";
import type { WireLinesStore } from "../store/WireLinesStore";

interface HitTestResult {
    entity: { id: string; type: EntityType } | null;
    fixingPoint: { id: string; poleId: string; pos: Pos } | null;
    svgPos: Pos;
    screenPos: Pos;
}

interface IPole {
    id: string;
    pos: Pos;
    radius: number;
}

const HIT_RADII = {
    fixingPoint: 8, // px на экране
    pole: 12,
    wire: 6,
} as const;

export class HitTestService {
    constructor(
        private polesStore: PolesStore,
        private vlPolesStore: VlPolesStore,
        private fixingPointsStore: FixingPointsStore,
        private wireLinesStore: WireLinesStore,
    ) {}

    private _calcDistanceSquared(a: Pos, b: Pos): number {
        return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
    }

    private _calcDistanceToSegmentSquared(p: Pos, a: Pos, b: Pos): number {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const lenSq = dx * dx + dy * dy;

        if (lenSq === 0) {
            return this._calcDistanceSquared(p, a);
        }

        let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));

        const proj: Pos = {
            x: a.x + t * dx,
            y: a.y + t * dy,
        };

        return this._calcDistanceSquared(p, proj);
    }

    hitTest(svgPos: Pos, screenPos: Pos, viewBox: ViewBox, svgClientWidth: number): HitTestResult {
        const svgPerPx = viewBox.width / svgClientWidth;

        const fpResult = this._hitTestFixingPoints(svgPos, svgPerPx);

        if (fpResult) {
            return {
                entity: { id: fpResult.id, type: "fixingPoint" },
                fixingPoint: { id: fpResult.id, poleId: fpResult.poleId, pos: fpResult.pos },
                svgPos,
                screenPos,
            };
        }

        // 2. Опоры КС
        const csPole = this._hitTestPoles(svgPos, svgPerPx, this.polesStore.poles, "catenaryPole");

        if (csPole) {
            return { entity: csPole, fixingPoint: null, svgPos, screenPos };
        }

        // 3. Опоры ВЛ
        const vlPole = this._hitTestPoles(svgPos, svgPerPx, this.vlPolesStore.poles, "vlPole");
        if (vlPole) {
            return { entity: vlPole, fixingPoint: null, svgPos, screenPos };
        }

        // 4. Провода
        const wire = this._hitTestWires(svgPos, svgPerPx);
        if (wire) {
            return { entity: wire, fixingPoint: null, svgPos, screenPos };
        }

        return { entity: null, fixingPoint: null, svgPos, screenPos };
    }

    hitTestRect(topLeft: Pos, bottomRight: Pos): Array<{ id: string; type: EntityType }> {
        const results: Array<{ id: string; type: EntityType }> = [];
        const minX = Math.min(topLeft.x, bottomRight.x);
        const maxX = Math.max(topLeft.x, bottomRight.x);
        const minY = Math.min(topLeft.y, bottomRight.y);
        const maxY = Math.max(topLeft.y, bottomRight.y);

        const inRect = (p: Pos) => p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY;

        for (const [id, pole] of this.polesStore.poles) {
            if (inRect(pole.pos)) {
                results.push({ id, type: "catenaryPole" });
            }
        }
        for (const [id, pole] of this.vlPolesStore.poles) {
            if (inRect(pole.pos)) {
                results.push({ id, type: "vlPole" });
            }
        }

        return results;
    }

    private _hitTestFixingPoints(svgPos: Pos, svgPerPx: number): { id: string; poleId: string; pos: Pos } | null {
        const radiusSq = (HIT_RADII.fixingPoint * svgPerPx) ** 2;
        let closest: { id: string; poleId: string; pos: Pos; dist: number } | null = null;

        for (const [id, fp] of this.fixingPointsStore.fixingPoints) {
            const d = this._calcDistanceSquared(svgPos, fp.startPos);
            if (d <= radiusSq && (!closest || d < closest.dist)) {
                closest = { id, poleId: fp.poleId, pos: fp.startPos, dist: d };
            }
        }

        return closest;
    }

    private _hitTestPoles(
        svgPos: Pos,
        svgPerPx: number,
        poles: Map<string, IPole>,
        type: EntityType,
    ): { id: string; type: EntityType } | null {
        // Используем максимум из экранного радиуса и визуального радиуса опоры,
        // чтобы область попадания всегда покрывала видимый символ
        const screenRadiusSvg = HIT_RADII.pole * svgPerPx;
        let closest: { id: string; type: EntityType; dist: number } | null = null;

        for (const [id, pole] of poles) {
            const hitRadius = Math.max(screenRadiusSvg, pole.radius);
            const d = this._calcDistanceSquared(svgPos, pole.pos);
            if (d <= hitRadius ** 2 && (!closest || d < closest.dist)) {
                closest = { id, type, dist: d };
            }
        }

        return closest;
    }

    private _hitTestWires(svgPos: Pos, svgPerPx: number): { id: string; type: EntityType } | null {
        const radiusSq = (HIT_RADII.wire * svgPerPx) ** 2;
        let closest: { id: string; type: EntityType; dist: number } | null = null;

        for (const [id, wire] of this.wireLinesStore.wireLines) {
            for (const fp of wire.fixingPoints) {
                const d = this._calcDistanceToSegmentSquared(svgPos, fp.startPos, fp.endPos);
                if (d <= radiusSq && (!closest || d < closest.dist)) {
                    closest = { id, type: "wireLine", dist: d };
                }
            }
        }

        return closest;
    }
}
