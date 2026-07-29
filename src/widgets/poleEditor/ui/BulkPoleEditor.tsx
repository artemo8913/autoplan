import React, { useCallback, useState } from "react";
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
    Tooltip,
} from "@mantine/core";

import type { GroundingType } from "@/shared/types/catenaryTypes";
import { SidePanel } from "@/shared/ui/SidePanel";
import type { CatenaryPole } from "@/entities/catenaryPlanGraphic";
import { useStore, useServices } from "@/app";

import { computeBulkPoleValues, type BulkPoleCommonTrack } from "../lib/computeBulkPoleValues";
import { GABARIT_INPUT_STEP, DIRECTION_LABEL, DIRECTION_TITLE, GROUNDING_DESCRIPTION } from "./constants";
import styles from "./PoleEditorPanel.module.css";

// ── BulkTrackBindingRow ───────────────────────────────────────────────────────

interface BulkTrackBindingRowProps {
    trackName: string;
    gabarit: BulkPoleCommonTrack["gabarit"];
    direction: BulkPoleCommonTrack["direction"];
    onGabaritChange: (value: string | number) => void;
    onDirectionToggle: () => void;
    onRemove: () => void;
}

const BulkTrackBindingRow: React.FC<BulkTrackBindingRowProps> = ({
    trackName,
    gabarit,
    direction,
    onGabaritChange,
    onDirectionToggle,
    onRemove,
}) => {
    const isMixedGabarit = gabarit === "mixed";
    const isMixedDirection = direction === "mixed";

    const directionLabel = isMixedDirection ? "?" : DIRECTION_LABEL[direction];
    const directionTooltip = isMixedDirection ? "Разные значения (нажать для смены)" : DIRECTION_TITLE[direction];

    return (
        <div className={styles["panel__track-row"]}>
            <Text size="xs" className={styles["panel__track-name"]}>
                {trackName}
            </Text>
            <NumberInput
                className={styles["panel__track-gabarit"]}
                size="xs"
                title="Габарит до пути, м"
                value={isMixedGabarit ? "" : gabarit}
                placeholder={isMixedGabarit ? "—" : undefined}
                step={GABARIT_INPUT_STEP}
                min={0}
                decimalScale={2}
                onChange={onGabaritChange}
            />
            <Text size="xs" c="dimmed">
                м
            </Text>
            <Tooltip label={directionTooltip} withArrow>
                <ActionIcon variant="subtle" size="sm" onClick={onDirectionToggle}>
                    <Text size="xs" fw={600}>
                        {directionLabel}
                    </Text>
                </ActionIcon>
            </Tooltip>
            <ActionIcon
                variant="subtle"
                color="red"
                size="sm"
                title="Удалить привязку к пути у всех опор"
                onClick={onRemove}
            >
                ×
            </ActionIcon>
        </div>
    );
};

// ── BulkPoleEditor ────────────────────────────────────────────────────────────

interface BulkPoleEditorProps {
    poles: CatenaryPole[];
    onClose: () => void;
}

export const BulkPoleEditor = observer(({ poles, onClose }: BulkPoleEditorProps) => {
    const { tracksStore } = useStore();
    const { editService } = useServices();

    const handleMaterialChange = useCallback(
        (value: string | null) => {
            if (!value || value === "mixed") {
                return;
            }
            editService.setBulkMaterial(poles, value as "concrete" | "metal");
        },
        [poles, editService],
    );

    const handleAnchorGuyTypeChange = useCallback(
        (value: string | null) => {
            if (!value || value === "mixed") {
                return;
            }
            editService.setBulkAnchorGuyType(poles, value as "none" | "single" | "double");
        },
        [poles, editService],
    );

    const handleAnchorGuyDirectionToggle = useCallback(() => {
        editService.toggleBulkAnchorGuyDirection(poles);
    }, [poles, editService]);

    const handleAnchorBraceChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            editService.setBulkAnchorBrace(poles, e.target.checked);
        },
        [poles, editService],
    );

    const handleGroundingChange = useCallback(
        (value: string | null) => {
            if (!value || value === "mixed") {
                return;
            }
            editService.setBulkGrounding(poles, value as GroundingType | "none");
        },
        [poles, editService],
    );

    const handleTrackGabaritChange = useCallback(
        (trackId: string, value: string | number) => {
            const v = typeof value === "number" ? value : parseFloat(value);
            if (isNaN(v) || v < 0) {
                return;
            }
            editService.setBulkTrackGabarit(poles, trackId, v);
        },
        [poles, editService],
    );

    const handleTrackDirectionToggle = useCallback(
        (trackId: string) => {
            editService.toggleBulkTrackDirection(poles, trackId);
        },
        [poles, editService],
    );

    const handleTrackRemove = useCallback(
        (trackId: string) => {
            editService.removeBulkTrack(poles, trackId);
        },
        [poles, editService],
    );

    const handleAddTrack = useCallback(
        (value: string | null) => {
            if (value) {
                editService.addBulkTrack(poles, value);
            }
        },
        [poles, editService],
    );

    // ── Производные значения ──────────────────────────────────────────────────

    const bulk = computeBulkPoleValues(poles);

    // Перенос привязки: источник — один из общих путей
    const [reassignFrom, setReassignFrom] = useState<string | null>(null);
    const commonTrackIds = new Set(bulk.commonTracks.map((t) => t.trackId));
    const effectiveFrom =
        reassignFrom && commonTrackIds.has(reassignFrom) ? reassignFrom : (bulk.commonTracks[0]?.trackId ?? null);

    const handleReassignTo = useCallback(
        (toTrackId: string | null) => {
            if (effectiveFrom && toTrackId) {
                editService.reassignBulkTrack(poles, effectiveFrom, toTrackId);
            }
        },
        [poles, editService, effectiveFrom],
    );

    // Пути, ещё не привязанные ко всем выделенным опорам
    const addableTracks = tracksStore.list.filter((t) => !commonTrackIds.has(t.id));
    const reassignTargets = tracksStore.list.filter((t) => t.id !== effectiveFrom);

    const materialData = [
        ...(bulk.material === "mixed" ? [{ value: "mixed", label: "—", disabled: true }] : []),
        { value: "concrete", label: "Ж/Б" },
        { value: "metal", label: "Металл" },
    ];

    const anchorGuyData = [
        ...(bulk.anchorGuyType === "mixed" ? [{ value: "mixed", label: "—", disabled: true }] : []),
        { value: "none", label: "Нет" },
        { value: "single", label: "Одинарная" },
        { value: "double", label: "Двойная" },
    ];

    const groundingData = [
        ...(bulk.grounding === "mixed" ? [{ value: "mixed", label: "—", disabled: true }] : []),
        { value: "none", label: "Нет" },
        { value: "И", label: "И" },
        { value: "ИИ", label: "ИИ" },
        { value: "ИДЗ", label: "ИДЗ" },
        { value: "ГДЗ", label: "ГДЗ" },
        { value: "ТГЗ", label: "ТГЗ" },
    ];

    const showAnchorGuyDirection = bulk.anchorGuyType !== "none" && bulk.anchorGuyType !== "mixed";

    const anchorGuyDirLabel =
        bulk.anchorGuyDirection === "mixed"
            ? "?"
            : bulk.anchorGuyDirection !== null
              ? DIRECTION_LABEL[bulk.anchorGuyDirection]
              : "";

    const anchorGuyDirTooltip =
        bulk.anchorGuyDirection === "mixed"
            ? "Разные значения (нажать для смены)"
            : bulk.anchorGuyDirection !== null
              ? DIRECTION_TITLE[bulk.anchorGuyDirection]
              : "";

    const groundingDescription =
        bulk.grounding !== "none" && bulk.grounding !== "mixed" ? GROUNDING_DESCRIPTION[bulk.grounding] : null;

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <SidePanel title={`Опоры (${poles.length})`} onClose={onClose} width={280}>
            <Stack gap="sm">
                <Stack gap={4}>
                    <Text size="xs" c="dimmed" className={styles["panel__section-title"]}>
                        Привязка к путям (общие)
                    </Text>
                    {bulk.commonTracks.map(({ trackId, gabarit, direction }) => (
                        <BulkTrackBindingRow
                            key={trackId}
                            trackName={tracksStore.tracks.get(trackId)?.name ?? trackId}
                            gabarit={gabarit}
                            direction={direction}
                            onGabaritChange={(v) => handleTrackGabaritChange(trackId, v)}
                            onDirectionToggle={() => handleTrackDirectionToggle(trackId)}
                            onRemove={() => handleTrackRemove(trackId)}
                        />
                    ))}
                    {bulk.commonTracks.length === 0 && (
                        <Text size="xs" c="dimmed" fs="italic">
                            Нет общих путей у выделенных опор
                        </Text>
                    )}

                    {effectiveFrom && (
                        <Group gap={4} align="flex-end" wrap="nowrap">
                            <Select
                                size="xs"
                                label="Перенести с пути"
                                value={effectiveFrom}
                                data={bulk.commonTracks.map((t) => ({
                                    value: t.trackId,
                                    label: tracksStore.tracks.get(t.trackId)?.name ?? t.trackId,
                                }))}
                                onChange={setReassignFrom}
                                allowDeselect={false}
                                style={{ flex: 1 }}
                            />
                            <Select
                                size="xs"
                                label="на путь"
                                placeholder="выбрать…"
                                value={null}
                                data={reassignTargets.map((t) => ({ value: t.id, label: t.name }))}
                                onChange={handleReassignTo}
                                style={{ flex: 1 }}
                            />
                        </Group>
                    )}

                    <Select
                        size="xs"
                        placeholder="+ Добавить путь ко всем…"
                        value={null}
                        data={addableTracks.map((t) => ({ value: t.id, label: t.name }))}
                        onChange={handleAddTrack}
                    />
                </Stack>
                <Divider />

                <Stack gap={4}>
                    <Text size="xs">Материал</Text>
                    <SegmentedControl
                        size="xs"
                        fullWidth
                        value={bulk.material}
                        data={materialData}
                        onChange={handleMaterialChange}
                    />
                </Stack>

                <Stack gap={4}>
                    <Text size="xs">Анкерная оттяжка</Text>
                    <SegmentedControl
                        size="xs"
                        fullWidth
                        value={bulk.anchorGuyType}
                        data={anchorGuyData}
                        onChange={handleAnchorGuyTypeChange}
                    />
                </Stack>

                {showAnchorGuyDirection && (
                    <Group gap="xs" align="center">
                        <Text size="xs" c="dimmed">
                            Направление
                        </Text>
                        <Tooltip label={anchorGuyDirTooltip} withArrow>
                            <ActionIcon variant="subtle" size="sm" onClick={handleAnchorGuyDirectionToggle}>
                                <Text size="xs" fw={600}>
                                    {anchorGuyDirLabel}
                                </Text>
                            </ActionIcon>
                        </Tooltip>
                    </Group>
                )}

                <Checkbox
                    label="Подкос"
                    size="xs"
                    checked={bulk.anchorBrace === true}
                    indeterminate={bulk.anchorBrace === "mixed"}
                    onChange={handleAnchorBraceChange}
                />

                <Stack gap={4}>
                    <Text size="xs">Заземление</Text>
                    <SegmentedControl
                        size="xs"
                        fullWidth
                        value={bulk.grounding}
                        data={groundingData}
                        onChange={handleGroundingChange}
                    />
                    {groundingDescription && (
                        <Text size="xs" c="dimmed">
                            {groundingDescription}
                        </Text>
                    )}
                </Stack>
            </Stack>
        </SidePanel>
    );
});

BulkPoleEditor.displayName = "BulkPoleEditor";
