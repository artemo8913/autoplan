import React, { useState } from "react";
import { observer } from "mobx-react-lite";
import { ActionIcon, NumberInput, Select, Text, TextInput } from "@mantine/core";

import type { WireType } from "@/shared/types/catenaryTypes";
import type { FixingPoint, WireLine } from "@/entities/catenaryPlanGraphic";
import { useServices, useStore } from "@/app";

import { WIRE_TYPE_LABELS } from "../lib/wireTypeLabels";
import { buildPoleSelectData } from "../lib/poleSelectData";
import { AddFpRow } from "./AddFpRow";
import { CollapsibleSection } from "@/shared/ui/CollapsibleSection";
import styles from "./LinesEditorPanel.module.css";

// ── Constants ─────────────────────────────────────────────────────────────────

const WIRE_TYPE_DATA = Object.entries(WIRE_TYPE_LABELS).map(([value, label]) => ({ value, label }));

// ── WireFpRow ─────────────────────────────────────────────────────────────────

interface WireFpRowProps {
    fp: FixingPoint;
    index: number;
    total: number;
    wire: WireLine;
    onInsertToggle: (fpId: string) => void;
    onDelete: (fp: FixingPoint) => void;
}

const WireFpRow: React.FC<WireFpRowProps> = observer(({ fp, index, total, wire, onInsertToggle, onDelete }) => {
    const { linesService } = useServices();

    return (
        <div className={styles.fpRow}>
            <Text size="xs" c="dimmed" className={styles.fpRow__name}>
                {fp.pole.name}
            </Text>
            <NumberInput
                size="xs"
                value={fp.yOffset}
                onChange={(v) => {
                    if (typeof v === "number") {
                        linesService.setFixingPointYOffset(fp, v);
                    }
                }}
                placeholder="смещ."
                step={1}
                className={styles.fpRow__input}
            />
            <div className={styles.fpRow__arrows}>
                <ActionIcon
                    variant="subtle"
                    color="gray"
                    size={14}
                    onClick={() => linesService.moveFixingPoint(wire, fp.id, "up")}
                    disabled={index === 0}
                >
                    ▴
                </ActionIcon>
                <ActionIcon
                    variant="subtle"
                    color="gray"
                    size={14}
                    onClick={() => linesService.moveFixingPoint(wire, fp.id, "down")}
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
});

// ── WireLineRow ───────────────────────────────────────────────────────────────

interface WireLineRowProps {
    wire: WireLine;
    onDelete: (wire: WireLine) => void;
    onDeleteFp: (fp: FixingPoint, parent: WireLine) => void;
}

export const WireLineRow: React.FC<WireLineRowProps> = observer(({ wire, onDelete, onDeleteFp }) => {
    const { catenaryPoleStore, vlPolesStore } = useStore();
    const { linesService } = useServices();
    const [insertAfterId, setInsertAfterId] = useState<string | null>(null);

    const allPoleSelectData = [
        ...buildPoleSelectData(catenaryPoleStore.list),
        ...vlPolesStore.list.map((p) => ({ value: p.id, label: `${p.name} (ВЛ)` })),
    ];

    const typeLabel = WIRE_TYPE_LABELS[wire.wireType] ?? wire.wireType;
    const displayName = wire.label ? `${typeLabel} (${wire.label})` : typeLabel;

    const handleAddFp = (poleId: string, afterFpId?: string) => {
        const pole = catenaryPoleStore.poles.get(poleId) ?? vlPolesStore.vlPoles.get(poleId);
        if (!pole) {
            return;
        }
        linesService.addFixingPoint(wire, { pole, yOffset: 0, afterFpId });
    };

    return (
        <CollapsibleSection
            title={
                <Text size="xs" fw={500}>
                    {displayName}
                </Text>
            }
            defaultOpen={false}
            level={1}
            extra={
                <ActionIcon variant="subtle" color="red" size="xs" onClick={() => onDelete(wire)}>
                    ✕
                </ActionIcon>
            }
        >
            <div className={styles.fields}>
                <Select
                    size="xs"
                    label="Тип"
                    data={WIRE_TYPE_DATA}
                    value={wire.wireType}
                    onChange={(v) => {
                        if (v) {
                            linesService.setWireLineType(wire, v as WireType);
                        }
                    }}
                />
                <TextInput
                    size="xs"
                    label="Метка"
                    value={wire.label ?? ""}
                    onChange={(e) => linesService.setWireLineLabel(wire, e.target.value || undefined)}
                />
            </div>

            <CollapsibleSection title="Точки фиксации" defaultOpen={false} level={2}>
                {wire.fixingPoints.map((fp, i) => (
                    <React.Fragment key={fp.id}>
                        <WireFpRow
                            fp={fp}
                            index={i}
                            total={wire.fixingPoints.length}
                            wire={wire}
                            onInsertToggle={(fpId) => setInsertAfterId(insertAfterId === fpId ? null : fpId)}
                            onDelete={(f) => onDeleteFp(f, wire)}
                        />
                        {insertAfterId === fp.id && (
                            <AddFpRow
                                poleSelectData={allPoleSelectData}
                                onAdd={(poleId) => {
                                    handleAddFp(poleId, insertAfterId);
                                    setInsertAfterId(null);
                                }}
                            />
                        )}
                    </React.Fragment>
                ))}
                <AddFpRow poleSelectData={allPoleSelectData} onAdd={handleAddFp} />
            </CollapsibleSection>
        </CollapsibleSection>
    );
});
