import React, { useCallback } from "react";
import { observer } from "mobx-react-lite";
import { ActionIcon, NumberInput, Text, Tooltip } from "@mantine/core";

import type { CatenaryPole, Track, TrackBinding } from "@/entities/catenaryPlanGraphic";
import { useServices } from "@/app";

import { GABARIT_INPUT_STEP, DIRECTION_LABEL, DIRECTION_TITLE } from "./constants";
import styles from "./PoleEditorPanel.module.css";

interface TrackBindingRowProps {
    trackId: string;
    binding: TrackBinding;
    track: Track | undefined;
    pole: CatenaryPole;
}

export const TrackBindingRow: React.FC<TrackBindingRowProps> = observer(({ trackId, binding, track, pole }) => {
    const { editService } = useServices();
    const isPrimary = pole.primaryTrackId === trackId;

    const handleGabaritChange = useCallback(
        (value: string | number) => {
            const v = typeof value === "number" ? value : parseFloat(value);
            if (!isNaN(v) && v >= 0) {
                editService.setPoleTrackGabarit(pole, trackId, v);
            }
        },
        [editService, pole, trackId],
    );

    const handleDirectionToggle = useCallback(
        () => editService.togglePoleTrackDirection(pole, trackId),
        [editService, pole, trackId],
    );

    const handleRemove = useCallback(() => editService.removePoleTrack(pole, trackId), [editService, pole, trackId]);

    const handleMakePrimary = useCallback(
        () => editService.setPolePrimaryTrack(pole, trackId),
        [editService, pole, trackId],
    );

    return (
        <div className={styles["panel__track-row"]}>
            <Tooltip
                label={isPrimary ? "Главный путь: по нему считается положение опоры" : "Сделать главным путём"}
                withArrow
            >
                <ActionIcon
                    variant="subtle"
                    size="sm"
                    c={isPrimary ? "yellow.7" : "dimmed"}
                    disabled={isPrimary}
                    onClick={handleMakePrimary}
                >
                    <Text size="xs">{isPrimary ? "★" : "☆"}</Text>
                </ActionIcon>
            </Tooltip>
            <Text size="xs" fw={isPrimary ? 600 : 400} className={styles["panel__track-name"]}>
                {track?.name ?? trackId}
            </Text>
            <NumberInput
                className={styles["panel__track-gabarit"]}
                size="xs"
                title="Габарит до пути, м"
                value={binding.gabarit}
                step={GABARIT_INPUT_STEP}
                min={0}
                decimalScale={2}
                onChange={handleGabaritChange}
            />
            <Text size="xs" c="dimmed">
                м
            </Text>
            <Tooltip label={DIRECTION_TITLE[binding.relativePositionToTrack]} withArrow>
                <ActionIcon variant="subtle" size="sm" onClick={handleDirectionToggle}>
                    <Text size="xs" fw={600}>
                        {DIRECTION_LABEL[binding.relativePositionToTrack]}
                    </Text>
                </ActionIcon>
            </Tooltip>
            <ActionIcon variant="subtle" color="red" size="sm" title="Удалить привязку к пути" onClick={handleRemove}>
                ×
            </ActionIcon>
        </div>
    );
});

TrackBindingRow.displayName = "TrackBindingRow";
