import type { Pos } from "@/shared/types/catenaryTypes";
import type { GabaritAxisSnap, NearbyTrackSnap, PlaceableEntityConfig, SnapInfo } from "@/shared/types/toolTypes";
import { offsetFromY } from "@/entities/catenaryPlanGraphic";
import { SNAP_GRID_STEP_X, GABARIT_SNAP_STEP_M, CATENARY_POLE_SCALE_Y } from "@/shared/constants";
import { metersToKmPkM } from "@/shared/lib/measure";

import type { TracksStore } from "../store/TracksStore";

interface ITrack {
    id: string;
    startX: number;
    endX: number;
    directionMultiplier: number;
    getPositionAtX(x: number): Pos;
}

/** Путь рядом с курсором: сам путь, его Y и знаковое расстояние до курсора. */
interface TrackCandidate {
    track: ITrack;
    /** SVG Y пути в точке курсора */
    trackY: number;
    /** trackY - cursorY: отрицательное = путь выше курсора, положительное = ниже */
    deltaY: number;
}

/** Округление до шага сетки без хвостов вида 2.4000000000000004. */
function roundToStep(value: number, step: number): number {
    return Math.round(Math.round(value / step) * step * 1000) / 1000;
}

// ── SnapService ────────────────────────────────────────────────────────────

export class SnapService {
    constructor(
        private tracksStore: TracksStore,
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

    /**
     * Опора КС: X — на сетку, Y — на ось габарита ближайшего пути.
     * Ось габарита — линия вдоль пути на расстоянии, кратном GABARIT_SNAP_STEP_M:
     * мышью точнее не поставить, а в плане габарит всё равно с одним знаком после запятой.
     */
    private _snapCatenaryPole(cursorPos: Pos): SnapInfo {
        const candidates = this._findNearbyTracks(cursorPos);
        const reference = candidates[0];

        const snappedX = roundToStep(cursorPos.x, SNAP_GRID_STEP_X);
        const snappedY = reference ? this._snapYToGabaritAxis(reference) : cursorPos.y;
        const coords = metersToKmPkM(snappedX, this.tracksStore.railway.picketage);

        const nearbyTracks: NearbyTrackSnap[] = candidates.map((candidate) =>
            this._bindingFromAxis(candidate, snappedY),
        );

        const gabaritAxis: GabaritAxisSnap | undefined = reference && {
            trackId: reference.track.id,
            axisY: snappedY,
            trackY: reference.trackY,
            offsetMeters: nearbyTracks[0].offsetMeters,
        };

        return {
            snappedTo: reference ? "track" : "none",
            nearbyTracks,
            gabaritAxis,
            km: coords.km,
            pk: coords.pk,
            m: coords.m,
            snappedPos: { x: snappedX, y: snappedY },
            magnetDistance: reference ? Math.abs(reference.deltaY) : Infinity,
        };
    }

    /**
     * Ближайшие пути сверху и снизу от курсора, в порядке близости.
     * Первый станет главным путём опоры — от него же отсчитывается ось габарита.
     */
    private _findNearbyTracks(cursorPos: Pos): TrackCandidate[] {
        let closestAbove: TrackCandidate | null = null;
        let closestBelow: TrackCandidate | null = null;

        for (const track of this.tracksStore.list) {
            // Пропустить пути, которые не охватывают текущую X-координату
            if (cursorPos.x < track.startX || cursorPos.x > track.endX) {
                continue;
            }

            const trackY = track.getPositionAtX(cursorPos.x).y;
            const deltaY = trackY - cursorPos.y;

            if (deltaY < 0) {
                // Путь выше курсора — ищем ближайший (наибольший deltaY, т.е. наименьший |deltaY|)
                if (!closestAbove || deltaY > closestAbove.deltaY) {
                    closestAbove = { track, trackY, deltaY };
                }
            } else if (deltaY > 0) {
                // Путь ниже курсора — ищем ближайший (наименьший deltaY)
                if (!closestBelow || deltaY < closestBelow.deltaY) {
                    closestBelow = { track, trackY, deltaY };
                }
            }
            // deltaY === 0: курсор точно на пути — игнорируем (нет смысла привязывать к нему)
        }

        return [closestAbove, closestBelow]
            .filter((candidate): candidate is TrackCandidate => candidate !== null)
            .sort((a, b) => Math.abs(a.deltaY) - Math.abs(b.deltaY));
    }

    /** Y ближайшей оси габарита: смещение от пути округляется до шага сетки. */
    private _snapYToGabaritAxis(reference: TrackCandidate): number {
        const offsetMeters = roundToStep(-reference.deltaY / CATENARY_POLE_SCALE_Y, GABARIT_SNAP_STEP_M);
        return reference.trackY + offsetMeters * CATENARY_POLE_SCALE_Y;
    }

    /** Знаковое смещение относительно пути для опоры, стоящей на оси axisY. */
    private _bindingFromAxis(candidate: TrackCandidate, axisY: number): NearbyTrackSnap {
        const { track, trackY } = candidate;

        return { trackId: track.id, trackY, offsetMeters: offsetFromY(axisY, trackY) };
    }

    private _snapGrid(cursorPos: Pos, includeGlobalY: boolean): SnapInfo {
        const snappedX = roundToStep(cursorPos.x, SNAP_GRID_STEP_X);
        const coords = metersToKmPkM(snappedX, this.tracksStore.railway.picketage);

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
