import React, { useCallback } from "react";
import { observer } from "mobx-react-lite";
import { ActionIcon, Button, Group, NumberInput, Stack, Text, TextInput, Tooltip } from "@mantine/core";

import type { Track, Railway } from "@/entities/catenaryPlanGraphic";
import { SidePanel } from "@/shared/ui/SidePanel";
import { useStore } from "@/app";

import styles from "./TracksEditorPanel.module.css";

// ── Константы ──────────────────────────────────────────────────────────────────

const Y_OFFSET_STEP = 0.5;
const X_STEP = 1;
const RAILWAY_X_STEP = 100;

// ── RailwaySection ────────────────────────────────────────────────────────────

interface RailwaySectionProps {
    railway: Railway;
}

const RailwaySection: React.FC<RailwaySectionProps> = observer(({ railway }) => {
    const handleNameChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => railway.setName(e.target.value),
        [railway],
    );
    const handleStartXChange = useCallback(
        (value: string | number) => {
            const v = typeof value === "number" ? value : parseFloat(value);
            if (!isNaN(v)) {
                railway.setStartX(v);
            }
        },
        [railway],
    );
    const handleEndXChange = useCallback(
        (value: string | number) => {
            const v = typeof value === "number" ? value : parseFloat(value);
            if (!isNaN(v)) {
                railway.setEndX(v);
            }
        },
        [railway],
    );

    return (
        <Stack gap={4} mb="sm">
            <Text size="sm" fw={600}>
                Участок
            </Text>
            <TextInput size="xs" label="Название" value={railway.name} onChange={handleNameChange} />
            <Group grow gap={4}>
                <NumberInput
                    label="Начало X"
                    size="xs"
                    step={RAILWAY_X_STEP}
                    value={railway.startX}
                    onChange={handleStartXChange}
                />
                <NumberInput
                    label="Конец X"
                    size="xs"
                    step={RAILWAY_X_STEP}
                    value={railway.endX}
                    onChange={handleEndXChange}
                />
            </Group>
        </Stack>
    );
});

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
        (value: string | number) => {
            const v = typeof value === "number" ? value : parseFloat(value);
            if (!isNaN(v)) {
                track.setYOffsetMeters(v);
            }
        },
        [track],
    );
    const handleStartXChange = useCallback(
        (value: string | number) => {
            const v = typeof value === "number" ? value : parseFloat(value);
            if (!isNaN(v)) {
                track.setStartX(v);
            }
        },
        [track],
    );
    const handleEndXChange = useCallback(
        (value: string | number) => {
            const v = typeof value === "number" ? value : parseFloat(value);
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
        <div className={styles.track}>
            <div className={styles["track__header"]}>
                <TextInput
                    className={styles["track__name"]}
                    size="xs"
                    label="Номер пути"
                    value={track.name}
                    onChange={handleNameChange}
                />
                <Text size="xs" c="dimmed">
                    {sideLabel}
                </Text>
                <Tooltip label={isBlocked ? `Нельзя удалить: ${blockReason}` : "Удалить путь"} withArrow>
                    <ActionIcon variant="subtle" color="red" size="sm" onClick={handleDeleteClick} disabled={isBlocked}>
                        ✕
                    </ActionIcon>
                </Tooltip>
            </div>
            <Stack gap={4}>
                <NumberInput
                    label="Смещение, м"
                    size="xs"
                    step={Y_OFFSET_STEP}
                    value={track.yOffsetMeters}
                    onChange={handleYOffsetChange}
                />
                <Group grow gap={4}>
                    <NumberInput
                        label="Начало X"
                        size="xs"
                        step={X_STEP}
                        value={track.startX}
                        onChange={handleStartXChange}
                    />
                    <NumberInput
                        label="Конец X"
                        size="xs"
                        step={X_STEP}
                        value={track.endX}
                        onChange={handleEndXChange}
                    />
                </Group>
            </Stack>
        </div>
    );
});

function TracksEditorPanelComponent() {
    const { tracksStore, catenaryPoleStore, fixingPointsStore, uiPanelsStore } = useStore();

    const handleDelete = useCallback((track: Track) => tracksStore.remove(track.id), [tracksStore]);

    const getTrackDeleteBlockReason = (trackId: string) => {
        const boundPolesCount = catenaryPoleStore.list.filter((p) => trackId in p.tracks).length;
        const boundFPsCount = fixingPointsStore.list.filter((fp) => fp.track?.id === trackId).length;

        if (boundPolesCount > 0 && boundFPsCount > 0) {
            return `Привязано ${boundPolesCount} опор и ${boundFPsCount} точек фиксации`;
        }
        if (boundPolesCount > 0) {
            return `Привязано ${boundPolesCount} опор`;
        }
        if (boundFPsCount > 0) {
            return `Привязано ${boundFPsCount} точек фиксации`;
        }
        return null;
    };

    if (!uiPanelsStore.isOpenTracksEditorPanel) {
        return null;
    }

    return (
        <SidePanel
            title="Пути"
            onClose={() => uiPanelsStore.toggleTracksEditorPanel()}
            width={300}
            headerExtra={
                <Button variant="light" size="xs" onClick={() => tracksStore.createNewTrack()}>
                    + Добавить путь
                </Button>
            }
        >
            <RailwaySection railway={tracksStore.railway} />
            {tracksStore.list.map((track) => (
                <TrackRow
                    key={track.id}
                    track={track}
                    blockReason={getTrackDeleteBlockReason(track.id)}
                    onDelete={handleDelete}
                />
            ))}
        </SidePanel>
    );
}

export const TracksEditorPanel = observer(TracksEditorPanelComponent);
