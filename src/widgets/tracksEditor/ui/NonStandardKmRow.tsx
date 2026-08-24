import React, { useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import { ActionIcon, Group, NumberInput, Select, Stack, Text, Tooltip } from "@mantine/core";

import type { Railway } from "@/entities/catenaryPlanGraphic";
import type { NonStandardKm } from "@/shared/types/catenaryTypes";
import { PICKET_LENGTH_M } from "@/shared/constants";
import { nonStandardKmLengthMeters } from "@/shared/lib/measure";
import {
    availablePicketIndices,
    removeNonStandardKm,
    removePicketOverride,
    renameKm,
    setPicketCount,
    setPicketOverride,
    sortedOverrides,
    validateKmNumber,
    validatePicketLength,
} from "@/shared/lib/picketageOps";
import { useServices, useStore } from "@/app";

import styles from "./TracksEditorPanel.module.css";

interface NonStandardKmRowProps {
    entry: NonStandardKm;
    railway: Railway;
    startKm: number;
    endKm: number;
}

export const NonStandardKmRow: React.FC<NonStandardKmRowProps> = observer(({ entry, railway, startKm, endKm }) => {
    const { trackService } = useServices();
    const { confirmDialogStore } = useStore();
    const picketage = railway.picketage;
    const [kmDraft, setKmDraft] = useState<number | string>(entry.km);
    const [addIdx, setAddIdx] = useState<string | null>(null);
    const [addLen, setAddLen] = useState<number | string>("");

    // при переименовании км извне синхронизируем черновик
    useEffect(() => setKmDraft(entry.km), [entry.km]);

    const otherKms = picketage.map((e) => e.km).filter((k) => k !== entry.km);
    const overrides = sortedOverrides(entry);
    const available = availablePicketIndices(entry);
    const totalM = nonStandardKmLengthMeters(entry);

    const commitKm = () => {
        const km = Math.floor(Number(kmDraft));
        if (validateKmNumber(km, startKm, endKm, otherKms).ok) {
            trackService.setPicketage(
                renameKm(picketage, entry.km, km),
                `Номер нестандартного км: ${entry.km} → ${km}`,
            );
        } else {
            setKmDraft(entry.km);
        }
    };

    const handleCount = (value: number | string) => {
        const n = Number(value);
        if (!Number.isNaN(n)) {
            trackService.setPicketage(
                setPicketCount(picketage, entry.km, n),
                `Число ПК в км ${entry.km}: ${n}`,
                `picketCount:${entry.km}`,
            );
        }
    };

    const handleDelete = async () => {
        const confirmed = await confirmDialogStore.ask({
            title: "Удалить нестандартный км?",
            message: `Км ${entry.km} снова станет стандартным (10 ПК по 100 м).`,
            details: ["Координаты опор на этом км пересчитаются", "Действие можно отменить (Ctrl+Z)"],
            confirmLabel: "Удалить",
            danger: true,
        });

        if (confirmed) {
            trackService.setPicketage(removeNonStandardKm(picketage, entry.km), `Удалён нестандартный км ${entry.km}`);
        }
    };

    const handleOverrideLen = (idx: number, value: number | string) => {
        const n = Math.floor(Number(value));
        if (validatePicketLength(n).ok) {
            trackService.setPicketage(
                setPicketOverride(picketage, entry.km, idx, n),
                `Длина ПК${idx} км ${entry.km}: ${n} м`,
                `picketLength:${entry.km}:${idx}`,
            );
        }
    };

    const commitAddOverride = () => {
        if (addIdx !== null) {
            const len = Math.floor(Number(addLen));
            if (validatePicketLength(len).ok && len !== PICKET_LENGTH_M) {
                trackService.setPicketage(
                    setPicketOverride(picketage, entry.km, Number(addIdx), len),
                    `Длина ПК${addIdx} км ${entry.km}: ${len} м`,
                );
            }
        }
        setAddIdx(null);
        setAddLen("");
    };

    return (
        <div className={styles.nsKm}>
            <Group gap={4} wrap="nowrap" align="flex-end">
                <NumberInput
                    size="xs"
                    label="км"
                    w={72}
                    value={kmDraft}
                    onChange={setKmDraft}
                    onBlur={commitKm}
                    allowDecimal={false}
                />
                <NumberInput
                    size="xs"
                    label="ПК"
                    w={56}
                    min={1}
                    value={entry.picketCount}
                    onChange={handleCount}
                    allowDecimal={false}
                />
                <Text size="xs" c="dimmed" style={{ flex: 1 }}>
                    Σ {totalM} м
                </Text>
                <Tooltip label="Удалить км" withArrow>
                    <ActionIcon variant="subtle" color="red" size="sm" onClick={() => void handleDelete()}>
                        ✕
                    </ActionIcon>
                </Tooltip>
            </Group>

            <Stack gap={2} pl={8} mt={4}>
                {overrides.map(({ idx, lengthM }) => (
                    <Group key={idx} gap={4} wrap="nowrap" align="center">
                        <Text size="xs" w={46}>
                            ПК{idx}
                        </Text>
                        <NumberInput
                            size="xs"
                            w={72}
                            min={1}
                            value={lengthM}
                            onChange={(v) => handleOverrideLen(idx, v)}
                            allowDecimal={false}
                        />
                        <Text size="xs" c="dimmed">
                            м
                        </Text>
                        <ActionIcon
                            variant="subtle"
                            color="red"
                            size="xs"
                            onClick={() =>
                                trackService.setPicketage(
                                    removePicketOverride(picketage, entry.km, idx),
                                    `Сброшена длина ПК${idx} км ${entry.km}`,
                                )
                            }
                        >
                            ✕
                        </ActionIcon>
                    </Group>
                ))}

                {addIdx === null ? (
                    available.length > 0 && (
                        <Text
                            size="xs"
                            c="blue"
                            style={{ cursor: "pointer", width: "fit-content" }}
                            onClick={() => setAddIdx(String(available[0]))}
                        >
                            + рубленый пикет
                        </Text>
                    )
                ) : (
                    <Group gap={4} wrap="nowrap" align="center">
                        <Select
                            size="xs"
                            w={76}
                            data={available.map((i) => ({ value: String(i), label: `ПК${i}` }))}
                            value={addIdx}
                            onChange={setAddIdx}
                            comboboxProps={{ withinPortal: false }}
                        />
                        <NumberInput
                            size="xs"
                            w={72}
                            min={1}
                            placeholder="м"
                            value={addLen}
                            onChange={setAddLen}
                            allowDecimal={false}
                        />
                        <Tooltip label="Добавить" withArrow>
                            <ActionIcon variant="subtle" color="green" size="xs" onClick={commitAddOverride}>
                                ✓
                            </ActionIcon>
                        </Tooltip>
                        <ActionIcon
                            variant="subtle"
                            size="xs"
                            onClick={() => {
                                setAddIdx(null);
                                setAddLen("");
                            }}
                        >
                            ✕
                        </ActionIcon>
                    </Group>
                )}
            </Stack>
        </div>
    );
});

NonStandardKmRow.displayName = "NonStandardKmRow";
