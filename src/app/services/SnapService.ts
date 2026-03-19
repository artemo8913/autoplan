import { RelativeSidePosition, type Pos } from "@/shared/types/catenaryTypes";
import type { PlaceableEntityConfig } from "@/shared/types/toolTypes";
import { CATENARY_POLE_SCALE_Y } from "@/shared/constants";
import { svgXToKmPkM } from "@/shared/lib/measure";

import type { TracksStore } from "../store/TracksStore";

// ── NearbyTrackSnap ───────────────────────────────────────────────────────────
/** Информация об одном из найденных ближайших путей для опоры КС */
export interface NearbyTrackSnap {
    trackId: string;
    /** SVG Y-координата трека — для рендеринга пунктира в превью */
    trackY: number;
    /** Сторона опоры относительно направления пути */
    relativePositionToTrack: RelativeSidePosition;
    /** Габарит до пути, м (всегда >= 0, вычтен radius опоры) */
    gabarit: number;
}

// ── SnapInfo ──────────────────────────────────────────────────────────────────
export interface SnapInfo {
    /** К чему произошла привязка */
    snappedTo: "track" | "pole" | "fixingPoint" | "grid" | "none";

    /** Координата привязки (км пк м) */
    km?: number;
    pk?: number;
    m?: number;

    /** Глобальная Y-координата (для опор ВЛ, у которых нет габарита) */
    globalY?: number;

    /** Расстояние привязки в SVG-единицах (чем меньше, тем «сильнее» snap) */
    magnetDistance: number;

    /** Итоговая позиция после snap */
    snappedPos: Pos;

    /** Найденные пути рядом с курсором: ближайший выше и/или ниже (для опор КС) */
    nearbyTracks?: NearbyTrackSnap[];
}

interface ITrack {
    id: string;
    startX: number;
    endX: number;
    directionMultiplier: number;
    getPositionAtX(x: number): Pos;
}

const SNAP_CONFIG = {
    /** Шаг сетки по X (1 SVG unit = 1 метр) */
    gridStepX: 1,
    /** Радиус опоры по умолчанию (SVG-единиц) — для вычисления габарита */
    poleDefaultRadius: 20,
    /** Масштаб Y: SVG-единиц на 1 метр габарита */
    poleScaleY: CATENARY_POLE_SCALE_Y,
} as const;

// ── SnapService ────────────────────────────────────────────────────────────

export class SnapService {
    constructor(
        private tracksStore: TracksStore,
        private startKm: number = 0,
        private metersPerSvgUnit: number = 1,
    ) {}

    calcSnap(cursorPos: Pos, entityConfig: PlaceableEntityConfig): SnapInfo | null {
        switch (entityConfig.kind) {
            case "catenaryPole":
                return this._snapCatenaryPole(cursorPos);
            case "vlPole":
                return this._snapGrid(cursorPos, true);
            default:
                return this._snapGrid(cursorPos, false);
        }
    }

    private _snapCatenaryPole(cursorPos: Pos): SnapInfo {
        let closestAbove: { track: ITrack; trackY: number; deltaY: number } | null = null;
        let closestBelow: { track: ITrack; trackY: number; deltaY: number } | null = null;

        for (const track of this.tracksStore.tracks.values()) {
            // Пропустить пути, которые не охватывают текущую X-координату
            if (cursorPos.x < track.startX || cursorPos.x > track.endX) {
                continue;
            }

            const trackY = track.getPositionAtX(cursorPos.x).y;
            const deltaY = trackY - cursorPos.y; // отрицательное = трек выше курсора, положительное = ниже

            if (deltaY < 0) {
                // Трек выше курсора — ищем ближайший (наибольший deltaY, т.е. наименьший |deltaY|)
                if (!closestAbove || deltaY > closestAbove.deltaY) {
                    closestAbove = { track, trackY, deltaY };
                }
            } else if (deltaY > 0) {
                // Трек ниже курсора — ищем ближайший (наименьший deltaY)
                if (!closestBelow || deltaY < closestBelow.deltaY) {
                    closestBelow = { track, trackY, deltaY };
                }
            }
            // deltaY === 0: курсор точно на пути — игнорируем (нет смысла привязывать к нему)
        }

        const nearbyTracks: NearbyTrackSnap[] = [];

        for (const candidate of [closestAbove, closestBelow]) {
            if (!candidate) {
                continue;
            }
            const { track, trackY, deltaY } = candidate;
            const absDelta = Math.abs(deltaY);
            const gabarit = Math.max(0, (absDelta - SNAP_CONFIG.poleDefaultRadius) / SNAP_CONFIG.poleScaleY);
            const svgSign = deltaY < 0 ? 1 : -1; // курсор ниже трека → опора ниже (+1); выше → опора выше (-1)
            const relativePositionToTrack = (svgSign * track.directionMultiplier) as RelativeSidePosition;

            nearbyTracks.push({ trackId: track.id, trackY, relativePositionToTrack, gabarit });
        }

        const snappedX = Math.round(cursorPos.x / SNAP_CONFIG.gridStepX) * SNAP_CONFIG.gridStepX;
        const coords = svgXToKmPkM(snappedX, this.startKm, this.metersPerSvgUnit);

        return {
            snappedTo: nearbyTracks.length > 0 ? "track" : "none",
            nearbyTracks,
            km: coords.km,
            pk: coords.pk,
            m: coords.m,
            snappedPos: { x: snappedX, y: cursorPos.y },
            magnetDistance:
                nearbyTracks.length > 0
                    ? Math.min(...nearbyTracks.map((t) => Math.abs(t.trackY - cursorPos.y)))
                    : Infinity,
        };
    }

    private _snapGrid(cursorPos: Pos, includeGlobalY: boolean): SnapInfo {
        const snappedX = Math.round(cursorPos.x / SNAP_CONFIG.gridStepX) * SNAP_CONFIG.gridStepX;
        const coords = svgXToKmPkM(snappedX, this.startKm, this.metersPerSvgUnit);

        return {
            snappedTo: "grid",
            km: coords.km,
            pk: coords.pk,
            m: coords.m,
            ...(includeGlobalY ? { globalY: Math.round(cursorPos.y * 10) / 10 } : {}),
            snappedPos: { x: snappedX, y: cursorPos.y },
            magnetDistance: Math.abs(cursorPos.x - snappedX),
        };
    }
}
