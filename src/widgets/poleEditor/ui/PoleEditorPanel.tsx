import React, { useCallback } from "react";
import { observer } from "mobx-react-lite";
import {
    ActionIcon,
    Checkbox,
    Divider,
    Group,
    NumberInput,
    SegmentedControl,
    Select,
    Stack,
    Text,
    TextInput,
    Tooltip,
} from "@mantine/core";

import { RelativeSidePosition, type GroundingType } from "@/shared/types/catenaryTypes";
import type { CatenaryPole, Track } from "@/entities/catenaryPlanGraphic";
import { SidePanel } from "@/shared/ui/SidePanel";
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

const GROUNDING_DESCRIPTION: Record<string, string> = {
    none: "",
    И: "Индивидуальное",
    ИИ: "Двойное индивидуальное",
    ИДЗ: "Инд. диодная защита",
    ГДЗ: "Групповая диодная защита",
    ТГЗ: "Тросовое групповое заземление",
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

export const PoleEditorPanel = observer(() => {
    const { toolStateStore, selectionStore, catenaryPoleStore, tracksStore, uiPanelsStore } = useStore();
    const pole = selectionStore.firstSelectedId ? catenaryPoleStore.poles.get(selectionStore.firstSelectedId) : null;

    const handleClose = useCallback(() => {
        uiPanelsStore.togglePoleEditorPanel();
        toolStateStore.resetToIdle();
    }, [toolStateStore, uiPanelsStore]);

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

    const handleAnchorGuyDirectionToggle = useCallback(() => {
        if (!pole?.anchorGuy) {
            return;
        }
        const opposite =
            pole.anchorGuy.direction === RelativeSidePosition.LEFT
                ? RelativeSidePosition.RIGHT
                : RelativeSidePosition.LEFT;
        pole.setAnchorGuy({ ...pole.anchorGuy, direction: opposite });
    }, [pole]);

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

    if (!uiPanelsStore.isOpenPoleEditorPanel) {
        return null;
    }

    if (!pole) {
        return (
            <SidePanel title="Опора КС" onClose={handleClose} width={280}>
                <Text size="xs" c="dimmed">
                    Выберите опору КС на плане
                </Text>
            </SidePanel>
        );
    }

    const anchorGuyValue = pole.anchorGuy?.type ?? "none";
    const groundingValue = pole.grounding ?? "none";
    const trackEntries = Object.entries(pole.tracks);
    const availableTracks = tracksStore.list.filter((t) => !pole.tracks[t.id]);

    return (
        <SidePanel title={`Опора ${pole.name}`} onClose={handleClose} width={280}>
            <Stack gap="sm">
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

                <Stack gap={4}>
                    <Text size="xs">Материал</Text>
                    <SegmentedControl
                        size="xs"
                        fullWidth
                        value={pole.material}
                        data={[
                            { value: "concrete", label: "Ж/Б" },
                            { value: "metal", label: "Металл" },
                        ]}
                        onChange={handleMaterialChange}
                    />
                </Stack>

                <Stack gap={4}>
                    <Text size="xs">Анкерная оттяжка</Text>
                    <SegmentedControl
                        size="xs"
                        fullWidth
                        value={anchorGuyValue}
                        data={[
                            { value: "none", label: "Нет" },
                            { value: "single", label: "Одинарная" },
                            { value: "double", label: "Двойная" },
                        ]}
                        onChange={handleAnchorGuyTypeChange}
                    />
                </Stack>

                {pole.anchorGuy && (
                    <Group gap="xs" align="center">
                        <Text size="xs" c="dimmed">
                            Направление
                        </Text>
                        <Tooltip label={DIRECTION_TITLE[pole.anchorGuy.direction]} withArrow>
                            <ActionIcon variant="subtle" size="sm" onClick={handleAnchorGuyDirectionToggle}>
                                <Text size="xs" fw={600}>
                                    {DIRECTION_LABEL[pole.anchorGuy.direction]}
                                </Text>
                            </ActionIcon>
                        </Tooltip>
                    </Group>
                )}

                <Checkbox label="Подкос" size="xs" checked={!!pole.anchorBrace} onChange={handleAnchorBraceChange} />

                <Stack gap={4}>
                    <Text size="xs">Заземление</Text>
                    <SegmentedControl
                        size="xs"
                        fullWidth
                        value={groundingValue}
                        data={[
                            { value: "none", label: "Нет" },
                            { value: "И", label: "И" },
                            { value: "ИИ", label: "ИИ" },
                            { value: "ИДЗ", label: "ИДЗ" },
                            { value: "ГДЗ", label: "ГДЗ" },
                            { value: "ТГЗ", label: "ТГЗ" },
                        ]}
                        onChange={handleGroundingChange}
                    />
                    {groundingValue !== "none" && (
                        <Text size="xs" c="dimmed">
                            {GROUNDING_DESCRIPTION[groundingValue]}
                        </Text>
                    )}
                </Stack>
            </Stack>
        </SidePanel>
    );
});

PoleEditorPanel.displayName = "PoleEditorPanel";
