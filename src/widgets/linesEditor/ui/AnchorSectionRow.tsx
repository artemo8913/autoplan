import React, { useState } from "react";
import { observer } from "mobx-react-lite";
import { ActionIcon, NumberInput, SegmentedControl, Select, Stack, Text, TextInput } from "@mantine/core";

import { CatenaryType, RelativeSidePosition } from "@/shared/types/catenaryTypes";
import type { AnchorSection, FixingPoint } from "@/entities/catenaryPlanGraphic";
import { FixingPoint as FixingPointClass } from "@/entities/catenaryPlanGraphic";
import { useStore } from "@/app";

import { autoSetAnchorGuy } from "../lib/anchorSectionUtils";
import { AddFpRow } from "./AddFpRow";
import { CollapsibleSection } from "./CollapsibleSection";
import styles from "./LinesEditorPanel.module.css";

// ── Constants ─────────────────────────────────────────────────────────────────

const CATENARY_TYPE_DATA = Object.values(CatenaryType).map((v) => ({ value: v, label: v }));

type SelectData = Array<{ value: string; label: string }>;

// ── CatenaryFpRow ─────────────────────────────────────────────────────────────

interface CatenaryFpRowProps {
    fp: FixingPoint;
    index: number;
    total: number;
    section: AnchorSection;
    trackSelectData: SelectData;
    onInsertToggle: (fpId: string) => void;
    onDelete: (fp: FixingPoint) => void;
}

const CatenaryFpRow: React.FC<CatenaryFpRowProps> = observer(
    ({ fp, index, total, section, trackSelectData, onInsertToggle, onDelete }) => {
        const { tracksStore } = useStore();

        const handleTrackChange = (trackId: string | null) => {
            const track = trackId && trackId !== "__none__" ? tracksStore.tracks.get(trackId) : undefined;
            fp.setTrack(track);
        };

        return (
            <div className={styles.fpRow}>
                <Text size="xs" c="dimmed" className={styles.fpRow__name}>
                    {fp.pole.name}
                </Text>
                <Select
                    size="xs"
                    data={trackSelectData}
                    value={fp.track?.id ?? "__none__"}
                    onChange={handleTrackChange}
                    className={styles.fpRow__trackSelect}
                />
                <NumberInput
                    size="xs"
                    value={fp.zigzagValue ?? ""}
                    onChange={(v) => fp.setZigzagValue(typeof v === "number" ? v : undefined)}
                    placeholder="зигзаг"
                    step={50}
                    className={styles.fpRow__input}
                />
                <div className={styles.fpRow__arrows}>
                    <ActionIcon
                        variant="subtle"
                        color="gray"
                        size={14}
                        onClick={() => section.moveFixingPoint(fp.id, "up")}
                        disabled={index === 0}
                    >
                        ▴
                    </ActionIcon>
                    <ActionIcon
                        variant="subtle"
                        color="gray"
                        size={14}
                        onClick={() => section.moveFixingPoint(fp.id, "down")}
                        disabled={index === total - 1}
                    >
                        ▾
                    </ActionIcon>
                </div>
                <ActionIcon variant="subtle" color="blue" size="xs" onClick={() => onInsertToggle(fp.id)}>
                    +
                </ActionIcon>
                <ActionIcon variant="subtle" color="red" size="xs" onClick={() => onDelete(fp)}>
                    ✕
                </ActionIcon>
            </div>
        );
    },
);

// ── AnchorSectionRow ──────────────────────────────────────────────────────────

interface AnchorSectionRowProps {
    section: AnchorSection;
    onBulkCreate: (section: AnchorSection) => void;
    onDelete: (section: AnchorSection) => void;
    onDeleteFp: (fp: FixingPoint, parent: AnchorSection) => void;
}

export const AnchorSectionRow: React.FC<AnchorSectionRowProps> = observer(
    ({ section, onBulkCreate, onDelete, onDeleteFp }) => {
        const { catenaryPoleStore, tracksStore, fixingPointsStore } = useStore();
        const [insertAfterId, setInsertAfterId] = useState<string | null>(null);

        const trackSelectData: SelectData = [
            { value: "__none__", label: "(нет)" },
            ...tracksStore.list.map((t) => ({ value: t.id, label: `Путь ${t.name}` })),
        ];
        const poleSelectData: SelectData = catenaryPoleStore.list.map((p) => ({ value: p.id, label: `№${p.name}` }));

        const poleRange =
            section.startPole && section.endPole ? `№${section.startPole.name}–${section.endPole.name}` : "";
        const displayName = section.name || (poleRange ? `${section.type} ${poleRange}` : section.type);
        const canBulk = !!(section.startPole && section.endPole && section.primaryTrack);
        const defaultTrackId = section.primaryTrack?.id;

        const handleTrackChange = (trackId: string | null) => {
            const track = trackId && trackId !== "__none__" ? tracksStore.tracks.get(trackId) : undefined;
            section.setPrimaryTrack(track);
        };

        const handlePoleChange = (which: "start" | "end", poleId: string | null) => {
            const pole = poleId ? catenaryPoleStore.poles.get(poleId) : undefined;
            if (which === "start") {
                section.setStartPole(pole);
                autoSetAnchorGuy(pole, RelativeSidePosition.LEFT);
            } else {
                section.setEndPole(pole);
                autoSetAnchorGuy(pole, RelativeSidePosition.RIGHT);
            }
        };

        const handleAddFp = (poleId: string, trackId?: string) => {
            const pole = catenaryPoleStore.poles.get(poleId);
            if (!pole) {
                return;
            }
            const track = trackId ? tracksStore.tracks.get(trackId) : undefined;
            const fp = new FixingPointClass({ pole, track });
            section.addFixingPoint(fp);
            fixingPointsStore.add(fp);
        };

        const handleInsertFpAfter = (afterFpId: string, poleId: string, trackId?: string) => {
            const pole = catenaryPoleStore.poles.get(poleId);
            if (!pole) {
                return;
            }
            const track = trackId ? tracksStore.tracks.get(trackId) : undefined;
            const fp = new FixingPointClass({ pole, track });
            section.insertFixingPointAfter(afterFpId, fp);
            fixingPointsStore.add(fp);
        };

        return (
            <CollapsibleSection
                title={
                    <Text size="xs" fw={500}>
                        {displayName}
                    </Text>
                }
                defaultOpen={false}
                level={2}
                extra={
                    <ActionIcon variant="subtle" color="red" size="xs" onClick={() => onDelete(section)}>
                        ✕
                    </ActionIcon>
                }
            >
                <div className={styles.fields}>
                    <TextInput
                        size="xs"
                        label="Наименование"
                        value={section.name}
                        onChange={(e) => section.setName(e.target.value)}
                    />
                    <Stack gap={4}>
                        <Text size="xs">Тип</Text>
                        <SegmentedControl
                            size="xs"
                            fullWidth
                            data={CATENARY_TYPE_DATA}
                            value={section.type}
                            onChange={(v) => section.setType(v as CatenaryType)}
                        />
                    </Stack>
                    <Select
                        size="xs"
                        label="Начальная опора"
                        data={poleSelectData}
                        value={section.startPole?.id ?? null}
                        onChange={(v) => handlePoleChange("start", v)}
                        searchable
                        clearable
                        placeholder="не задана"
                    />
                    <Select
                        size="xs"
                        label="Конечная опора"
                        data={poleSelectData}
                        value={section.endPole?.id ?? null}
                        onChange={(v) => handlePoleChange("end", v)}
                        searchable
                        clearable
                        placeholder="не задана"
                    />
                    <Select
                        size="xs"
                        label="Путь"
                        data={trackSelectData}
                        value={section.primaryTrack?.id ?? "__none__"}
                        onChange={handleTrackChange}
                    />
                </div>

                <CollapsibleSection
                    title="Точки фиксации"
                    defaultOpen={false}
                    level={3}
                    extra={
                        <ActionIcon
                            variant="subtle"
                            color="blue"
                            size="xs"
                            onClick={() => onBulkCreate(section)}
                            disabled={!canBulk}
                            title="Массовое создание ТФ"
                        >
                            ⊕
                        </ActionIcon>
                    }
                >
                    {section.fixingPoints.map((fp, i) => (
                        <React.Fragment key={fp.id}>
                            <CatenaryFpRow
                                fp={fp}
                                index={i}
                                total={section.fixingPoints.length}
                                section={section}
                                trackSelectData={trackSelectData}
                                onInsertToggle={(fpId) => setInsertAfterId(insertAfterId === fpId ? null : fpId)}
                                onDelete={(f) => onDeleteFp(f, section)}
                            />
                            {insertAfterId === fp.id && (
                                <AddFpRow
                                    poleSelectData={poleSelectData}
                                    trackSelectData={trackSelectData}
                                    defaultTrackId={defaultTrackId}
                                    onAdd={(poleId, trackId) => {
                                        handleInsertFpAfter(insertAfterId, poleId, trackId);
                                        setInsertAfterId(null);
                                    }}
                                />
                            )}
                        </React.Fragment>
                    ))}
                    <AddFpRow
                        poleSelectData={poleSelectData}
                        trackSelectData={trackSelectData}
                        defaultTrackId={defaultTrackId}
                        onAdd={handleAddFp}
                    />
                </CollapsibleSection>
            </CollapsibleSection>
        );
    },
);
