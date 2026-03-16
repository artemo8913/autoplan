import React, { useCallback } from "react";
import { observer } from "mobx-react-lite";

import { useStore } from "@/app";
import type { Track } from "@/entities/catenaryPlanGraphic";
import type { PolesStore } from "@/app/store/PolesStore";
import type { FixingPointsStore } from "@/app/store/FixingPointsStore";

// ── Константы ──────────────────────────────────────────────────────────────────

const Y_OFFSET_STEP = 0.5;
const X_STEP = 1;
const NEW_TRACK_OFFSET_STEP = 5; // м, шаг при добавлении нового пути

// ── Helpers ────────────────────────────────────────────────────────────────────

function getBlockReason(trackId: string, polesStore: PolesStore, fixingPointsStore: FixingPointsStore): string | null {
    const boundPoles = polesStore.list.filter((p) => trackId in p.tracks).length;
    const boundFPs = fixingPointsStore.list.filter((fp) => fp.track?.id === trackId).length;

    if (boundPoles > 0 && boundFPs > 0) {
        return `Привязано ${boundPoles} опор и ${boundFPs} точек фиксации`;
    }
    if (boundPoles > 0) {
        return `Привязано ${boundPoles} опор`;
    }
    if (boundFPs > 0) {
        return `Привязано ${boundFPs} точек фиксации`;
    }
    return null;
}

function calcDefaultOffset(tracks: Track[]): number {
    if (tracks.length === 0) {
        return -5;
    }
    // Берём трек с максимальным |yOffset|, добавляем шаг в ту же сторону
    const furthest = tracks.reduce((a, b) => (Math.abs(a.yOffsetMeters) >= Math.abs(b.yOffsetMeters) ? a : b));
    const sign = furthest.yOffsetMeters >= 0 ? 1 : -1;
    return furthest.yOffsetMeters + sign * NEW_TRACK_OFFSET_STEP;
}

// ── TrackRow ───────────────────────────────────────────────────────────────────

interface TrackRowProps {
    track: Track;
    blockReason: string | null;
    onDelete: (track: Track) => void;
}

const TrackRow: React.FC<TrackRowProps> = observer(({ track, blockReason, onDelete }) => {
    const handleNameChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => track.setName(e.target.value),
        [track],
    );
    const handleYOffsetChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v)) {
                track.setYOffsetMeters(v);
            }
        },
        [track],
    );
    const handleStartXChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v)) {
                track.setStartX(v);
            }
        },
        [track],
    );
    const handleEndXChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v)) {
                track.setEndX(v);
            }
        },
        [track],
    );
    const handleDeleteClick = useCallback(() => onDelete(track), [track, onDelete]);

    const sideLabel = track.yOffsetMeters >= 0 ? "чётный" : "нечётный";
    const isBlocked = blockReason !== null;

    return (
        <div className="infrastructure-track-row">
            <div className="infrastructure-track-row__header">
                <input
                    className="infrastructure-track-row__name"
                    value={track.name}
                    onChange={handleNameChange}
                    title="Название пути"
                />
                <span className="infrastructure-track-row__side">{sideLabel}</span>
                <button
                    type="button"
                    className="infrastructure-track-row__delete"
                    onClick={handleDeleteClick}
                    disabled={isBlocked}
                    title={isBlocked ? `Нельзя удалить: ${blockReason}` : "Удалить путь"}
                >
                    ✕
                </button>
            </div>
            <div className="infrastructure-track-row__fields">
                <label className="infrastructure-field">
                    <span>Смещение, м</span>
                    <input
                        type="number"
                        step={Y_OFFSET_STEP}
                        value={track.yOffsetMeters}
                        onChange={handleYOffsetChange}
                    />
                </label>
                <label className="infrastructure-field">
                    <span>Начало X</span>
                    <input type="number" step={X_STEP} value={track.startX} onChange={handleStartXChange} />
                </label>
                <label className="infrastructure-field">
                    <span>Конец X</span>
                    <input type="number" step={X_STEP} value={track.endX} onChange={handleEndXChange} />
                </label>
            </div>
        </div>
    );
});

// ── InfrastructurePanel ────────────────────────────────────────────────────────

function InfrastructurePanelComponent() {
    const { uiStore, tracksStore, polesStore, fixingPointsStore } = useStore();

    const handleClose = useCallback(() => uiStore.toggleInfrastructurePanel(), [uiStore]);

    const handleAddTrack = useCallback(() => {
        const tracks = tracksStore.list;
        const defaultOffset = calcDefaultOffset(tracks);
        const ref = tracks[0];
        tracksStore.addTrack({
            name: `Путь ${tracks.length + 1}`,
            yOffsetMeters: defaultOffset,
            startX: ref?.startX ?? 0,
            endX: ref?.endX ?? 10000,
        });
    }, [tracksStore]);

    const handleDelete = useCallback(
        (track: Track) => {
            tracksStore.removeTrack(track.id);
        },
        [tracksStore],
    );

    if (!uiStore.isInfrastructurePanelOpen) {
        return null;
    }

    return (
        <div className="infrastructure-panel editor-panel">
            <div className="editor-panel__header">
                <span className="editor-panel__title">Пути</span>
                <button type="button" className="editor-panel__close" onClick={handleClose}>
                    ✕
                </button>
            </div>

            <div className="infrastructure-panel__tracks">
                {tracksStore.list.map((track) => (
                    <TrackRow
                        key={track.id}
                        track={track}
                        blockReason={getBlockReason(track.id, polesStore, fixingPointsStore)}
                        onDelete={handleDelete}
                    />
                ))}
            </div>

            <div className="infrastructure-panel__footer">
                <button type="button" className="btn-add" onClick={handleAddTrack}>
                    + Добавить путь
                </button>
            </div>
        </div>
    );
}

export const InfrastructurePanel = observer(InfrastructurePanelComponent);
