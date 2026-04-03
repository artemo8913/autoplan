import type { Pos } from "@/shared/types/catenaryTypes";
import type { EntityType, ViewBox } from "@/shared/types/toolTypes";
import {
    FIXING_POINT_HIT_RADIUS,
    POLE_HIT_RADIUS,
    WIRE_HIT_RADIUS,
    CROSS_SPAN_HIT_RADIUS,
    CATENARY_POLE_RADIUS,
    VL_POLE_DEFAULT_SIZE,
} from "@/shared/constants";

import type { PolesStore } from "../store/PolesStore";
import type { VlPolesStore } from "../store/VlPolesStore";
import type { FixingPointsStore } from "../store/FixingPointsStore";
import type { WireLinesStore } from "../store/WireLinesStore";
import type { AnchorSectionsStore } from "../store/AnchorSectionsStore";
import type { CrossSpansStore } from "../store/CrossSpansStore";
import type { DisconnectorsStore } from "../store/DisconnectorsStore";
import type { DisplaySettingsStore } from "../store/DisplaySettingsStore";
import type { InlineEditTarget } from "../store/InlineEditStore";

interface HitTestResult {
    entity: { id: string; type: EntityType } | null;
    fixingPoint: { id: string; poleId: string; pos: Pos } | null;
    svgPos: Pos;
    screenPos: Pos;
}

interface IPole {
    id: string;
    pos: Pos;
}
/** Радиус попадания для inline-edit лейблов (SVG-единиц) */
const LABEL_HIT_RADIUS = 20;

export interface EditTargetHitResult {
    editTarget: InlineEditTarget;
    svgPos: Pos;
    initialValue: string;
}

export class HitTestService {
    constructor(
        private polesStore: PolesStore,
        private vlPolesStore: VlPolesStore,
        private fixingPointsStore: FixingPointsStore,
        private wireLinesStore: WireLinesStore,
        private anchorSectionsStore: AnchorSectionsStore,
        private crossSpansStore: CrossSpansStore,
        private disconnectorsStore: DisconnectorsStore,
        private displaySettings: DisplaySettingsStore,
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
        const csPole = this._hitTestPoles(
            svgPos,
            svgPerPx,
            this.polesStore.poles,
            "catenaryPole",
            CATENARY_POLE_RADIUS,
        );

        if (csPole) {
            return { entity: csPole, fixingPoint: null, svgPos, screenPos };
        }

        // 3. Опоры ВЛ
        const vlPole = this._hitTestPoles(svgPos, svgPerPx, this.vlPolesStore.vlPoles, "vlPole", VL_POLE_DEFAULT_SIZE);
        if (vlPole) {
            return { entity: vlPole, fixingPoint: null, svgPos, screenPos };
        }

        // 4. Провода
        const wire = this._hitTestWires(svgPos, svgPerPx);
        if (wire) {
            return { entity: wire, fixingPoint: null, svgPos, screenPos };
        }

        // 5. Разъединители
        const disconnector = this._hitTestDisconnectors(svgPos, svgPerPx);
        if (disconnector) {
            return { entity: disconnector, fixingPoint: null, svgPos, screenPos };
        }

        // 6. Поперечины
        const crossSpan = this._hitTestCrossSpans(svgPos, svgPerPx);
        if (crossSpan) {
            return { entity: crossSpan, fixingPoint: null, svgPos, screenPos };
        }

        return { entity: null, fixingPoint: null, svgPos, screenPos };
    }

    hitTestPoleOnly(svgPos: Pos, svgPerPx: number): { id: string; type: EntityType } | null {
        return this._hitTestPoles(svgPos, svgPerPx, this.polesStore.poles, "catenaryPole", CATENARY_POLE_RADIUS);
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
        for (const [id, pole] of this.vlPolesStore.vlPoles) {
            if (inRect(pole.pos)) {
                results.push({ id, type: "vlPole" });
            }
        }
        for (const d of this.disconnectorsStore.list) {
            if (inRect(d.pos)) {
                results.push({ id: d.id, type: "disconnector" });
            }
        }
        for (const cs of this.crossSpansStore.list) {
            const mid: Pos = {
                x: (cs.poleA.pos.x + cs.poleB.pos.x) / 2,
                y: (cs.poleA.pos.y + cs.poleB.pos.y) / 2,
            };
            if (inRect(mid)) {
                results.push({ id: cs.id, type: "crossSpan" });
            }
        }

        return results;
    }

    private _hitTestDisconnectors(svgPos: Pos, svgPerPx: number): { id: string; type: EntityType } | null {
        const radiusSq = (POLE_HIT_RADIUS * svgPerPx) ** 2;
        let closest: { id: string; type: EntityType; dist: number } | null = null;

        for (const d of this.disconnectorsStore.list) {
            const dist = this._calcDistanceSquared(svgPos, d.pos);
            if (dist <= radiusSq && (!closest || dist < closest.dist)) {
                closest = { id: d.id, type: "disconnector", dist };
            }
        }

        return closest;
    }

    private _hitTestCrossSpans(svgPos: Pos, svgPerPx: number): { id: string; type: EntityType } | null {
        const radiusSq = (CROSS_SPAN_HIT_RADIUS * svgPerPx) ** 2;
        let closest: { id: string; type: EntityType; dist: number } | null = null;

        for (const cs of this.crossSpansStore.list) {
            const d = this._calcDistanceToSegmentSquared(svgPos, cs.poleA.pos, cs.poleB.pos);
            if (d <= radiusSq && (!closest || d < closest.dist)) {
                closest = { id: cs.id, type: "crossSpan", dist: d };
            }
        }

        return closest;
    }

    private _hitTestFixingPoints(svgPos: Pos, svgPerPx: number): { id: string; poleId: string; pos: Pos } | null {
        const radiusSq = (FIXING_POINT_HIT_RADIUS * svgPerPx) ** 2;
        let closest: { id: string; poleId: string; pos: Pos; dist: number } | null = null;

        for (const [id, fp] of this.fixingPointsStore.fixingPoints) {
            if (!this.polesStore.poles.has(fp.poleId)) {
                continue;
            }
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
        visualRadius: number,
    ): { id: string; type: EntityType } | null {
        // Используем максимум из экранного радиуса и визуального радиуса опоры,
        // чтобы область попадания всегда покрывала видимый символ
        const screenRadiusSvg = POLE_HIT_RADIUS * svgPerPx;
        const hitRadius = Math.max(screenRadiusSvg, visualRadius);
        const hitRadiusSq = hitRadius ** 2;
        let closest: { id: string; type: EntityType; dist: number } | null = null;

        for (const [id, pole] of poles) {
            const d = this._calcDistanceSquared(svgPos, pole.pos);
            if (d <= hitRadiusSq && (!closest || d < closest.dist)) {
                closest = { id, type, dist: d };
            }
        }

        return closest;
    }

    private _hitTestWires(svgPos: Pos, svgPerPx: number): { id: string; type: EntityType } | null {
        const radiusSq = (WIRE_HIT_RADIUS * svgPerPx) ** 2;
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

    // ── Inline-edit hit tests ────────────────────────────────────────────────

    hitTestEditTarget(svgPos: Pos): EditTargetHitResult | null {
        return (
            this._hitTestPoleLabel(svgPos) ?? this._hitTestZigzagLabel(svgPos) ?? this._hitTestSpanLengthLabel(svgPos)
        );
    }

    private _hitTestPoleLabel(svgPos: Pos): EditTargetHitResult | null {
        const radiusSq = LABEL_HIT_RADIUS ** 2;

        for (const pole of this.polesStore.list) {
            const primaryTrack = Object.values(pole.tracks)[0]?.track;
            const labelDir = primaryTrack?.directionMultiplier ?? -1;
            const labelPos: Pos = { x: pole.pos.x, y: pole.pos.y + labelDir * this.displaySettings.poleLabelYOffset };

            const d = this._calcDistanceSquared(svgPos, labelPos);
            if (d < radiusSq) {
                return {
                    editTarget: { kind: "poleName", poleId: pole.id },
                    svgPos: labelPos,
                    initialValue: pole.name,
                };
            }
        }

        return null;
    }

    private _hitTestZigzagLabel(svgPos: Pos): EditTargetHitResult | null {
        const radiusSq = LABEL_HIT_RADIUS ** 2;

        for (const fp of this.fixingPointsStore.list) {
            if (fp.zigzagValue === undefined) {
                continue;
            }

            const { endPos } = fp;
            const rawSign = Math.sign(fp.startPos.y - endPos.y);
            const dirToPole = rawSign >= 0 ? 1 : -1;
            const textPos: Pos = {
                x: endPos.x + this.displaySettings.zigzagTextXOffset,
                y: endPos.y + dirToPole * this.displaySettings.zigzagTextYMultiplier,
            };

            const d = this._calcDistanceSquared(svgPos, textPos);
            if (d < radiusSq) {
                return {
                    editTarget: { kind: "zigzagValue", fixingPointId: fp.id },
                    svgPos: textPos,
                    initialValue: String(fp.zigzagValue),
                };
            }
        }

        return null;
    }

    private _hitTestSpanLengthLabel(svgPos: Pos): EditTargetHitResult | null {
        const radiusSq = LABEL_HIT_RADIUS ** 2;

        for (const section of this.anchorSectionsStore.list) {
            const fps = section.fixingPoints;
            for (let i = 0; i < fps.length - 1; i++) {
                const fp = fps[i];
                const nextFp = fps[i + 1];
                if (!fp.track) {
                    continue;
                }

                const spanLength = Math.abs(nextFp.pole.x - fp.pole.x);
                const midX = (fp.pole.x + nextFp.pole.x) / 2;
                const trackY = fp.endPos.y;
                const dirToPole = fp.startPos ? Math.sign(fp.startPos.y - trackY) : -1;
                const labelPos: Pos = { x: midX, y: trackY + dirToPole * this.displaySettings.spanLabelYOffset };

                const d = this._calcDistanceSquared(svgPos, labelPos);
                if (d < radiusSq) {
                    return {
                        editTarget: {
                            kind: "spanLength",
                            leftFpId: fp.id,
                            rightFpId: nextFp.id,
                            trackId: fp.track.id,
                        },
                        svgPos: labelPos,
                        initialValue: String(Math.round(spanLength)),
                    };
                }
            }
        }

        return null;
    }

    findClosestCatenaryPole(pos: Pos): { id: string; yOffset: number } | null {
        let closest: { id: string; dist: number; poleY: number } | null = null;

        for (const [id, pole] of this.polesStore.poles) {
            const dx = pole.pos.x - pos.x;
            const dy = pole.pos.y - pos.y;
            const dist = dx * dx + dy * dy;
            if (!closest || dist < closest.dist) {
                closest = { id, dist, poleY: pole.pos.y };
            }
        }

        if (!closest) {
            return null;
        }

        return { id: closest.id, yOffset: pos.y - closest.poleY };
    }
}
