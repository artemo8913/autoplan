import React, { useCallback } from "react";
import { observer } from "mobx-react-lite";
import {
    ActionIcon,
    Box,
    Checkbox,
    Divider,
    Group,
    NumberInput,
    Select,
    Stack,
    Text,
    TextInput,
    Tooltip,
} from "@mantine/core";

import { RelativeSidePosition, type GroundingType } from "@/shared/types/catenaryTypes";
import type { CatenaryPole, Track } from "@/entities/catenaryPlanGraphic";
import { useStore } from "@/app";

import styles from "./PoleEditorPanel.module.css";

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
        (value: string | number) => {
            const v = typeof value === "number" ? value : parseFloat(value);
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
        <div className={styles["panel__track-row"]}>
            <Text size="xs" className={styles["panel__track-name"]}>
                {track?.name ?? trackId}
            </Text>
            <NumberInput
                className={styles["panel__track-gabarit"]}
                size="xs"
                title="Габарит до пути, м"
                value={relation.gabarit}
                step={GABARIT_INPUT_STEP}
                min={0}
                decimalScale={2}
                onChange={handleGabaritChange}
            />
            <Text size="xs" c="dimmed">
                м
            </Text>
            <Tooltip label={DIRECTION_TITLE[relation.relativePositionToTrack]} withArrow>
                <ActionIcon variant="subtle" size="sm" onClick={handleDirectionToggle}>
                    <Text size="xs" fw={600}>
                        {DIRECTION_LABEL[relation.relativePositionToTrack]}
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
        (value: string | number) => {
            const v = typeof value === "number" ? value : Number(value);
            if (!isNaN(v)) {
                pole?.setX(v);
            }
        },
        [pole],
    );

    const handleMaterialChange = useCallback(
        (value: string | null) => {
            if (value) {
                pole?.setMaterial(value as "concrete" | "metal");
            }
        },
        [pole],
    );

    const handleAnchorGuyTypeChange = useCallback(
        (value: string | null) => {
            if (!pole || !value) {
                return;
            }
            if (value === "none") {
                pole.setAnchorGuy(undefined);
            } else {
                pole.setAnchorGuy({
                    type: value as "single" | "double",
                    direction: pole.anchorGuy?.direction ?? RelativeSidePosition.LEFT,
                });
            }
        },
        [pole],
    );

    const handleAnchorGuyDirectionChange = useCallback(
        (value: string | null) => {
            if (!pole?.anchorGuy || !value) {
                return;
            }
            pole.setAnchorGuy({
                ...pole.anchorGuy,
                direction: Number(value) as RelativeSidePosition,
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
        (value: string | null) => {
            pole?.setGrounding(value === "none" || !value ? undefined : (value as GroundingType));
        },
        [pole],
    );

    const handleAddTrack = useCallback(
        (value: string | null) => {
            if (!pole || !value) {
                return;
            }
            const track = tracksStore.tracks.get(value);
            if (!track || pole.tracks[value]) {
                return;
            }
            pole.addTrackBinding(track);
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
        <Box className={styles.panel}>
            <Group justify="space-between" className={styles["panel__header"]}>
                <Text fw={600} size="sm">
                    Опора {pole.name}
                </Text>
                <ActionIcon variant="subtle" color="gray" size="sm" onClick={handleClose} aria-label="Закрыть">
                    ✕
                </ActionIcon>
            </Group>

            <Stack gap="sm" className={styles["panel__body"]}>
                <TextInput label="Название" size="xs" value={pole.name} onChange={handleNameChange} />

                <NumberInput
                    label="Позиция X, м"
                    size="xs"
                    value={pole.x}
                    step={X_INPUT_STEP}
                    onChange={handleXChange}
                />

                <Divider />

                <Stack gap={4}>
                    <Text size="xs" c="dimmed" className={styles["panel__section-title"]}>
                        Привязка к путям
                    </Text>
                    {trackEntries.map(([trackId, relation]) => (
                        <TrackBindingRow
                            key={trackId}
                            trackId={trackId}
                            relation={relation}
                            track={tracksStore.tracks.get(trackId)}
                            pole={pole}
                        />
                    ))}
                    {trackEntries.length === 0 && (
                        <Text size="xs" c="dimmed" fs="italic">
                            Нет привязок к путям
                        </Text>
                    )}
                    <Select
                        size="xs"
                        placeholder="+ Добавить путь…"
                        value={null}
                        data={availableTracks.map((t) => ({ value: t.id, label: t.name }))}
                        onChange={handleAddTrack}
                    />
                </Stack>

                <Divider />

                <Select
                    label="Материал"
                    size="xs"
                    value={pole.material}
                    data={[
                        { value: "concrete", label: "Ж/Б (окружность)" },
                        { value: "metal", label: "Металл (квадрат)" },
                    ]}
                    onChange={handleMaterialChange}
                />

                <Select
                    label="Анкерная оттяжка"
                    size="xs"
                    value={anchorGuyValue}
                    data={[
                        { value: "none", label: "Нет" },
                        { value: "single", label: "Одинарная" },
                        { value: "double", label: "Двойная" },
                    ]}
                    onChange={handleAnchorGuyTypeChange}
                />

                {pole.anchorGuy && (
                    <Select
                        label="Направление оттяжки"
                        size="xs"
                        value={String(pole.anchorGuy.direction)}
                        data={[
                            { value: String(RelativeSidePosition.LEFT), label: "Влево" },
                            { value: String(RelativeSidePosition.RIGHT), label: "Вправо" },
                        ]}
                        onChange={handleAnchorGuyDirectionChange}
                    />
                )}

                <Checkbox label="Подкос" size="xs" checked={!!pole.anchorBrace} onChange={handleAnchorBraceChange} />

                <Select
                    label="Заземление"
                    size="xs"
                    value={groundingValue}
                    data={[
                        { value: "none", label: "Нет" },
                        { value: "И", label: "И — индивидуальное" },
                        { value: "ИИ", label: "ИИ — двойное инд." },
                        { value: "ИДЗ", label: "ИДЗ — инд. диодная защита" },
                        { value: "ГДЗ", label: "ГДЗ — групповая диодная" },
                        { value: "ТГЗ", label: "ТГЗ — тросовое групповое" },
                    ]}
                    onChange={handleGroundingChange}
                />
            </Stack>
        </Box>
    );
});

PoleEditorPanel.displayName = "PoleEditorPanel";
