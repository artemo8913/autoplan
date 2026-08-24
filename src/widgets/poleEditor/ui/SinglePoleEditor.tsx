import React, { useCallback } from "react";
import { observer } from "mobx-react-lite";
import {
    ActionIcon,
    Checkbox,
    Divider,
    Group,
    SegmentedControl,
    Select,
    Stack,
    Text,
    TextInput,
    Tooltip,
} from "@mantine/core";

import type { GroundingType } from "@/shared/types/catenaryTypes";
import type { CatenaryPole } from "@/entities/catenaryPlanGraphic";
import { SidePanel } from "@/shared/ui/SidePanel";
import { KmPkMInput } from "@/shared/ui/KmPkMInput";
import { metersToKmPkM, kmPkMToMeters } from "@/shared/lib/measure";
import { kmPkMLimits } from "@/shared/lib/picketageOps";
import { useServices, useStore } from "@/app";

import { DIRECTION_LABEL, DIRECTION_TITLE, GROUNDING_DESCRIPTION } from "./constants";
import { TrackBindingRow } from "./TrackBindingRow";
import styles from "./PoleEditorPanel.module.css";

interface SinglePoleEditorProps {
    pole: CatenaryPole;
    onClose: () => void;
}

export const SinglePoleEditor = observer(({ pole, onClose }: SinglePoleEditorProps) => {
    const { tracksStore } = useStore();
    const { editService } = useServices();

    const handleNameChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            editService.setPoleName(pole, e.target.value);
        },
        [editService, pole],
    );

    const picketage = tracksStore.railway.picketage;
    const { km, pk, m } = metersToKmPkM(pole.x, picketage);

    const handleKmChange = useCallback(
        (value: number) => editService.setPoleX(pole, kmPkMToMeters(value, pk, m, picketage)),
        [editService, pole, pk, m, picketage],
    );
    const handlePkChange = useCallback(
        (value: number) => editService.setPoleX(pole, kmPkMToMeters(km, value, m, picketage)),
        [editService, pole, km, m, picketage],
    );
    const handleMChange = useCallback(
        (value: number) => editService.setPoleX(pole, kmPkMToMeters(km, pk, value, picketage)),
        [editService, pole, km, pk, picketage],
    );

    const handleMaterialChange = useCallback(
        (value: string | null) => {
            if (value) {
                editService.setPoleMaterial(pole, value as "concrete" | "metal");
            }
        },
        [editService, pole],
    );

    const handleAnchorGuyTypeChange = useCallback(
        (value: string | null) => {
            if (value) {
                editService.setPoleAnchorGuyType(pole, value as "none" | "single" | "double");
            }
        },
        [editService, pole],
    );

    const handleAnchorGuyDirectionToggle = useCallback(
        () => editService.togglePoleAnchorGuyDirection(pole),
        [editService, pole],
    );

    const handleAnchorBraceChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => editService.setPoleAnchorBrace(pole, e.target.checked),
        [editService, pole],
    );

    const handleGroundingChange = useCallback(
        (value: string | null) => editService.setPoleGrounding(pole, (value as GroundingType | "none") ?? "none"),
        [editService, pole],
    );

    const handleAddTrack = useCallback(
        (value: string | null) => {
            if (value) {
                editService.addPoleTrack(pole, value);
            }
        },
        [editService, pole],
    );

    const anchorGuyValue = pole.anchorGuy?.type ?? "none";
    const groundingValue = pole.grounding ?? "none";
    const trackEntries = Object.entries(pole.tracks);
    const availableTracks = tracksStore.list.filter((t) => !pole.tracks[t.id]);

    return (
        <SidePanel title={`Опора ${pole.name}`} onClose={onClose} width={280}>
            <Stack gap="sm">
                <TextInput label="Название" size="xs" value={pole.name} onChange={handleNameChange} />

                <KmPkMInput
                    label="Позиция"
                    km={km}
                    pk={pk}
                    m={m}
                    onKmChange={handleKmChange}
                    onPkChange={handlePkChange}
                    onMChange={handleMChange}
                    {...kmPkMLimits(picketage, km, pk)}
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

SinglePoleEditor.displayName = "SinglePoleEditor";
