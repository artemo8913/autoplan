// ============================================================================
// SnapService — привязка к ближайшим путям, опорам, сетке
// ============================================================================

import type { Pos } from "@/shared/types/catenaryTypes";
import type { PlaceableEntityConfig } from "@/shared/types/toolTypes";
import type { ViewBox } from "../store/UIStore";

// ── SnapInfo ──────────────────────────────────────────────────────────────────
export interface SnapInfo {
    /** К чему произошла привязка */
    snappedTo: "track" | "pole" | "fixingPoint" | "grid" | "none";

    /** ID трека, к которому snap произошёл (для опор КС) */
    trackId?: string;

    /** Координата привязки (км пк м) */
    km?: number;
    pk?: number;
    m?: number;

    /** Габарит до ближайшего пути (м) — для опор КС */
    gauge?: number;

    /** Глобальная Y-координата (для опор ВЛ, у которых нет габарита) */
    globalY?: number;

    /** Расстояние привязки в SVG-единицах (чем меньше, тем «сильнее» snap) */
    magnetDistance: number;

    /** Итоговая позиция после snap */
    snappedPos: Pos;
}

import type { MeasureService } from "./MeasureService";

interface ITrack {
    id: string;
    getPositionAtX(x: number): Pos;
    displayName?: string;
}

interface ReadonlyStores {
    tracksStore: { tracks: Map<string, ITrack> };
}

const SNAP_CONFIG = {
    /** Максимальный радиус привязки к пути (в SVG-единицах) */
    trackSnapRadius: 200,
    /** Шаг сетки по X (1 SVG unit = 1 метр) */
    gridStepX: 1,
} as const;

// ── SnapService ────────────────────────────────────────────────────────────

export class SnapService {
    constructor(
        private stores: ReadonlyStores,
        private measureService: MeasureService,
        private startKm: number = 0,
        private metersPerSvgUnit: number = 1,
    ) {}

    calcSnap(
        cursorPos: Pos,
        entityConfig: PlaceableEntityConfig,
        viewBox: ViewBox,
        svgClientWidth: number,
    ): SnapInfo | null {
        switch (entityConfig.kind) {
            case "catenaryPole":
                return this._snapCatenaryPole(cursorPos, viewBox, svgClientWidth);
            case "vlPole":
                return this._snapVlPole(cursorPos);
            default:
                return this._snapGeneric(cursorPos);
        }
    }

    private _snapCatenaryPole(cursorPos: Pos, viewBox: ViewBox, svgClientWidth: number): SnapInfo | null {
        const svgPerPx = viewBox.width / svgClientWidth;

        let closestTrack: { id: string; trackPos: Pos; distance: number } | null = null;

        for (const [id, track] of this.stores.tracksStore.tracks) {
            const trackPos = track.getPositionAtX(cursorPos.x);
            const distance = Math.abs(cursorPos.y - trackPos.y);
            if (!closestTrack || distance < closestTrack.distance) {
                closestTrack = { id, trackPos, distance };
            }
        }

        if (!closestTrack) {
            return this._snapGeneric(cursorPos);
        }

        const snapRadius = SNAP_CONFIG.trackSnapRadius * svgPerPx;
        const isSnapped = closestTrack.distance <= snapRadius;
        const gaugeInSvg = cursorPos.y - closestTrack.trackPos.y;
        const gaugeInMeters = gaugeInSvg * this.metersPerSvgUnit;
        const snappedX = Math.round(cursorPos.x / SNAP_CONFIG.gridStepX) * SNAP_CONFIG.gridStepX;
        const coords = this.measureService.svgXToKmPkM(snappedX, this.startKm, this.metersPerSvgUnit);

        return {
            snappedTo: isSnapped ? "track" : "none",
            trackId: closestTrack.id,
            km: coords.km,
            pk: coords.pk,
            m: coords.m,
            gauge: Math.round(gaugeInMeters * 10) / 10,
            snappedPos: { x: snappedX, y: cursorPos.y },
            magnetDistance: closestTrack.distance,
        };
    }

    private _snapVlPole(cursorPos: Pos): SnapInfo {
        const snappedX = Math.round(cursorPos.x / SNAP_CONFIG.gridStepX) * SNAP_CONFIG.gridStepX;
        const coords = this.measureService.svgXToKmPkM(snappedX, this.startKm, this.metersPerSvgUnit);

        return {
            snappedTo: "grid",
            km: coords.km,
            pk: coords.pk,
            m: coords.m,
            globalY: Math.round(cursorPos.y * 10) / 10,
            snappedPos: { x: snappedX, y: cursorPos.y },
            magnetDistance: Math.abs(cursorPos.x - snappedX),
        };
    }

    private _snapGeneric(cursorPos: Pos): SnapInfo {
        const snappedX = Math.round(cursorPos.x / SNAP_CONFIG.gridStepX) * SNAP_CONFIG.gridStepX;
        const coords = this.measureService.svgXToKmPkM(snappedX, this.startKm, this.metersPerSvgUnit);

        return {
            snappedTo: "grid",
            km: coords.km,
            pk: coords.pk,
            m: coords.m,
            snappedPos: { x: snappedX, y: cursorPos.y },
            magnetDistance: Math.abs(cursorPos.x - snappedX),
        };
    }
}
