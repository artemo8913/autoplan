import React, { useCallback } from "react";
import { observer } from "mobx-react-lite";

import { RelativeSidePosition, type GroundingType } from "@/shared/types/catenaryTypes";
import type { CatenaryPole, Track } from "@/entities/catenaryPlanGraphic";
import { useStore } from "@/app";

// ── Константы ─────────────────────────────────────────────────────────────────

const GABARIT_INPUT_STEP = 0.1;
const X_INPUT_STEP = 1;

const DIRECTION_LABEL: Record<RelativeSidePosition, string> = {
    [RelativeSidePosition.LEFT]: "Л",
    [RelativeSidePosition.RIGHT]: "П",
};

const DIRECTION_TITLE: Record<RelativeSidePosition, string> = {
    [RelativeSidePosition.LEFT]: "Слева по ходу движения (нажать для смены)",
    [RelativeSidePosition.RIGHT]: "Справа по ходу движения (нажать для смены)",
};

// ── TrackBindingRow ───────────────────────────────────────────────────────────

interface TrackBindingRowProps {
    trackId: string;
    relation: CatenaryPole["tracks"][string];
    track: Track | undefined;
    pole: CatenaryPole;
}

const TrackBindingRow: React.FC<TrackBindingRowProps> = observer(({ trackId, relation, track, pole }) => {
    const oppositeDirection =
        relation.relativePositionToTrack === RelativeSidePosition.LEFT
            ? RelativeSidePosition.RIGHT
            : RelativeSidePosition.LEFT;

    const handleGabaritChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v) && v >= 0) {
                pole.setTrackGabarit(trackId, v);
            }
        },
        [pole, trackId],
    );

    const handleDirectionToggle = useCallback(() => {
        pole.setTrackDirection(trackId, oppositeDirection);
    }, [pole, trackId, oppositeDirection]);

    const handleRemove = useCallback(() => {
        pole.removeTrackBinding(trackId);
    }, [pole, trackId]);

    return (
        <div className="pole-editor-track-row">
            <span className="pole-editor-track-name">{track?.name ?? trackId}</span>
            <input
                type="number"
                title="Габарит до пути, м"
                value={relation.gabarit}
                step={GABARIT_INPUT_STEP}
                min={0}
                onChange={handleGabaritChange}
            />
            <span className="pole-editor-track-unit">м</span>
            <button
                type="button"
                title={DIRECTION_TITLE[relation.relativePositionToTrack]}
                onClick={handleDirectionToggle}
            >
                {DIRECTION_LABEL[relation.relativePositionToTrack]}
            </button>
            <button type="button" title="Удалить привязку к пути" onClick={handleRemove}>
                ×
            </button>
        </div>
    );
});

TrackBindingRow.displayName = "TrackBindingRow";

// ── PoleEditorPanel ───────────────────────────────────────────────────────────

export const PoleEditorPanel = observer(() => {
    const { uiStore, polesStore, tracksStore } = useStore();
    const pole = uiStore.selectedIds[0] ? polesStore.poles.get(uiStore.selectedIds[0]) : null;

    const handleClose = useCallback(() => uiStore.resetToIdle(), [uiStore]);

    const handleNameChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            pole?.setName(e.target.value);
        },
        [pole],
    );

    const handleXChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const v = Number(e.target.value);
            if (!isNaN(v)) {
                pole?.setX(v);
            }
        },
        [pole],
    );

    const handleMaterialChange = useCallback(
        (e: React.ChangeEvent<HTMLSelectElement>) => {
            pole?.setMaterial(e.target.value as "concrete" | "metal");
        },
        [pole],
    );

    const handleAnchorGuyTypeChange = useCallback(
        (e: React.ChangeEvent<HTMLSelectElement>) => {
            if (!pole) {
                return;
            }
            const val = e.target.value;
            if (val === "none") {
                pole.setAnchorGuy(undefined);
            } else {
                pole.setAnchorGuy({
                    type: val as "single" | "double",
                    direction: pole.anchorGuy?.direction ?? RelativeSidePosition.LEFT,
                });
            }
        },
        [pole],
    );

    const handleAnchorGuyDirectionChange = useCallback(
        (e: React.ChangeEvent<HTMLSelectElement>) => {
            if (!pole?.anchorGuy) {
                return;
            }
            pole.setAnchorGuy({
                ...pole.anchorGuy,
                direction: Number(e.target.value) as RelativeSidePosition,
            });
        },
        [pole],
    );

    const handleAnchorBraceChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            pole?.setAnchorBrace(e.target.checked ? { direction: RelativeSidePosition.RIGHT } : undefined);
        },
        [pole],
    );

    const handleGroundingChange = useCallback(
        (e: React.ChangeEvent<HTMLSelectElement>) => {
            const val = e.target.value;
            pole?.setGrounding(val === "none" ? undefined : (val as GroundingType));
        },
        [pole],
    );

    const handleAddTrack = useCallback(
        (e: React.ChangeEvent<HTMLSelectElement>) => {
            if (!pole) {
                return;
            }
            const trackId = e.target.value;
            if (!trackId) {
                return;
            }
            const track = tracksStore.tracks.get(trackId);
            if (!track || pole.tracks[trackId]) {
                return;
            }
            pole.addTrackBinding(track);
            e.target.value = "";
        },
        [pole, tracksStore],
    );

    if (!pole) {
        return null;
    }

    const anchorGuyValue = pole.anchorGuy?.type ?? "none";
    const groundingValue = pole.grounding ?? "none";
    const trackEntries = Object.entries(pole.tracks);
    const availableTracks = tracksStore.list.filter((t) => !pole.tracks[t.id]);

    return (
        <div className="pole-editor-panel">
            <div className="pole-editor-header">
                <span>Опора {pole.name}</span>
                <button type="button" onClick={handleClose}>
                    ✕
                </button>
            </div>

            <div className="pole-editor-field">
                <label>Название</label>
                <input type="text" title="Название опоры" value={pole.name} onChange={handleNameChange} />
            </div>

            <div className="pole-editor-field">
                <label>Позиция X, м</label>
                <input type="number" title="Позиция X, м" value={pole.x} step={X_INPUT_STEP} onChange={handleXChange} />
            </div>

            <div className="pole-editor-section">
                <div className="pole-editor-section-title">Привязка к путям</div>
                {trackEntries.map(([trackId, relation]) => (
                    <TrackBindingRow
                        key={trackId}
                        trackId={trackId}
                        relation={relation}
                        track={tracksStore.tracks.get(trackId)}
                        pole={pole}
                    />
                ))}
                {trackEntries.length === 0 && <div className="pole-editor-track-empty">Нет привязок к путям</div>}
                <div className="pole-editor-track-add">
                    <select title="Выбрать путь для добавления" defaultValue="" onChange={handleAddTrack}>
                        <option value="">+ Добавить путь…</option>
                        {availableTracks.map((t) => (
                            <option key={t.id} value={t.id}>
                                {t.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="pole-editor-field">
                <label>Материал</label>
                <select title="Материал опоры" value={pole.material} onChange={handleMaterialChange}>
                    <option value="concrete">Ж/Б (окружность)</option>
                    <option value="metal">Металл (квадрат)</option>
                </select>
            </div>

            <div className="pole-editor-field">
                <label>Анкерная оттяжка</label>
                <select title="Тип анкерной оттяжки" value={anchorGuyValue} onChange={handleAnchorGuyTypeChange}>
                    <option value="none">Нет</option>
                    <option value="single">Одинарная</option>
                    <option value="double">Двойная</option>
                </select>
            </div>

            {pole.anchorGuy && (
                <div className="pole-editor-field">
                    <label>Направление оттяжки</label>
                    <select
                        title="Направление оттяжки"
                        value={pole.anchorGuy.direction}
                        onChange={handleAnchorGuyDirectionChange}
                    >
                        <option value={RelativeSidePosition.LEFT}>Влево</option>
                        <option value={RelativeSidePosition.RIGHT}>Вправо</option>
                    </select>
                </div>
            )}

            <div className="pole-editor-field">
                <label>
                    <input type="checkbox" checked={!!pole.anchorBrace} onChange={handleAnchorBraceChange} /> Подкос
                </label>
            </div>

            <div className="pole-editor-field">
                <label>Заземление</label>
                <select title="Тип заземления" value={groundingValue} onChange={handleGroundingChange}>
                    <option value="none">Нет</option>
                    <option value="И">И — индивидуальное</option>
                    <option value="ИИ">ИИ — двойное инд.</option>
                    <option value="ИДЗ">ИДЗ — инд. диодная защита</option>
                    <option value="ГДЗ">ГДЗ — групповая диодная</option>
                    <option value="ТГЗ">ТГЗ — тросовое групповое</option>
                </select>
            </div>
        </div>
    );
});

PoleEditorPanel.displayName = "PoleEditorPanel";
