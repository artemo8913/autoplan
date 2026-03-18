import React, { useCallback } from "react";
import { observer } from "mobx-react-lite";
import { ActionIcon, Box, Button, Group, NumberInput, Stack, Text, TextInput, Tooltip } from "@mantine/core";

import type { Track } from "@/entities/catenaryPlanGraphic";
import { useStore, useServices } from "@/app";

import styles from "./InfrastructurePanel.module.css";

// ── Константы ──────────────────────────────────────────────────────────────────

const Y_OFFSET_STEP = 0.5;
const X_STEP = 1;
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
                    value={track.name}
                    onChange={handleNameChange}
                    title="Название пути"
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

// ── InfrastructurePanel ────────────────────────────────────────────────────────

function InfrastructurePanelComponent() {
    const { uiStore, tracksStore } = useStore();
    const { trackService } = useServices();

    const handleClose = useCallback(() => uiStore.toggleInfrastructurePanel(), [uiStore]);
    const handleAddTrack = useCallback(() => trackService.addTrack(), [trackService]);
    const handleDelete = useCallback((track: Track) => tracksStore.removeTrack(track.id), [tracksStore]);

    if (!uiStore.isInfrastructurePanelOpen) {
        return null;
    }

    return (
        <Box className={styles.panel}>
            <Group justify="space-between" className={styles["panel__header"]}>
                <Text fw={600} size="sm">
                    Пути
                </Text>
                <ActionIcon variant="subtle" color="gray" size="sm" onClick={handleClose} aria-label="Закрыть">
                    ✕
                </ActionIcon>
            </Group>

            <div className={styles["panel__tracks"]}>
                {tracksStore.list.map((track) => (
                    <TrackRow
                        key={track.id}
                        track={track}
                        blockReason={trackService.getTrackDeleteBlockReason(track.id)}
                        onDelete={handleDelete}
                    />
                ))}
            </div>

            <div className={styles["panel__footer"]}>
                <Button variant="light" size="xs" fullWidth onClick={handleAddTrack}>
                    + Добавить путь
                </Button>
            </div>
        </Box>
    );
}

export const InfrastructurePanel = observer(InfrastructurePanelComponent);
