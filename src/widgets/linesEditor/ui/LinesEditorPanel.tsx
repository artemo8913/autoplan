import { useState } from "react";
import { observer } from "mobx-react-lite";
import { ActionIcon, Button, Group, Modal, Text } from "@mantine/core";
import { SidePanel } from "@/shared/ui/SidePanel";

import type { AnchorSection, FixingPoint, WireLine } from "@/entities/catenaryPlanGraphic";
import {
    FixingPoint as FixingPointClass,
    AnchorSection as AnchorSectionClass,
    WireLine as WireLineClass,
} from "@/entities/catenaryPlanGraphic";
import type { CatenaryPole } from "@/entities/catenaryPlanGraphic";
import { useStore } from "@/app";

import { WIRE_TYPE_LABELS } from "../lib/wireTypeLabels";
import { AnchorSectionRow } from "./AnchorSectionRow";
import { BulkFpModal } from "./BulkFpModal";
import { CollapsibleSection } from "./CollapsibleSection";
import { WireLineRow } from "./WireLineRow";

// ── Types ─────────────────────────────────────────────────────────────────────

type DeleteTarget =
    | { kind: "anchorSection"; section: AnchorSection }
    | { kind: "wireLine"; wire: WireLine }
    | { kind: "fixingPoint"; fp: FixingPoint; parent: AnchorSection | WireLine };

// ── Helpers ───────────────────────────────────────────────────────────────────

function getAvailablePoles(section: AnchorSection, allPoles: CatenaryPole[]): CatenaryPole[] {
    const { startPole, endPole, primaryTrack } = section;
    if (!startPole || !endPole || !primaryTrack) {
        return [];
    }
    const minX = Math.min(startPole.x, endPole.x);
    const maxX = Math.max(startPole.x, endPole.x);
    const trackId = primaryTrack.id;
    const existing = new Set(section.fixingPoints.map((fp) => fp.pole.id));
    return allPoles
        .filter((p) => p.x >= minX && p.x <= maxX && p.tracks[trackId] && !existing.has(p.id))
        .sort((a, b) => a.x - b.x);
}

function getDeleteMessage(target: DeleteTarget): string {
    switch (target.kind) {
        case "anchorSection": {
            const s = target.section;
            const poleRange = s.startPole && s.endPole ? ` №${s.startPole.name}–${s.endPole.name}` : "";
            const name = s.name || `${s.type}${poleRange}`;
            return `Удалить АУ «${name}»? Будут также удалены ${s.fixingPoints.length} точек фиксации.`;
        }
        case "wireLine": {
            const w = target.wire;
            const typeLabel = WIRE_TYPE_LABELS[w.wireType] ?? w.wireType;
            const name = w.label ? `${typeLabel} (${w.label})` : typeLabel;
            return `Удалить линию «${name}»? Будут также удалены ${w.fixingPoints.length} точек фиксации.`;
        }
        case "fixingPoint":
            return `Удалить точку фиксации (опора ${target.fp.pole.name})?`;
    }
}

// ── LinesEditorPanel ──────────────────────────────────────────────────────────

function LinesEditorPanelComponent() {
    const { anchorSectionsStore, wireLinesStore, fixingPointsStore, tracksStore, catenaryPoleStore, uiPanelsStore } =
        useStore();
    const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
    const [bulkFpSection, setBulkFpSection] = useState<AnchorSection | null>(null);

    if (!uiPanelsStore.isOpenLinesEditorPanel) {
        return null;
    }

    // ── Group anchor sections by primaryTrack ─────────────────────────────────
    const byTrackId = new Map<string | null, AnchorSection[]>();
    for (const section of anchorSectionsStore.list) {
        const key = section.primaryTrack?.id ?? null;
        let arr = byTrackId.get(key);
        if (!arr) {
            arr = [];
            byTrackId.set(key, arr);
        }
        arr.push(section);
    }
    const tracksWithSections = tracksStore.list.filter((t) => byTrackId.has(t.id));
    const unbound = byTrackId.get(null);

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleBulkCreateFps = (section: AnchorSection, poleIds: string[]) => {
        for (const poleId of poleIds) {
            const pole = catenaryPoleStore.poles.get(poleId);
            if (!pole) {
                continue;
            }
            const fp = new FixingPointClass({ pole, track: section.primaryTrack });
            section.addFixingPoint(fp);
            fixingPointsStore.add(fp);
        }
        setBulkFpSection(null);
    };

    const confirmDelete = () => {
        if (!deleteTarget) {
            return;
        }
        switch (deleteTarget.kind) {
            case "anchorSection": {
                const fpIds = deleteTarget.section.fixingPoints.map((fp) => fp.id);
                fixingPointsStore.removeMany(fpIds);
                anchorSectionsStore.remove(deleteTarget.section.id);
                break;
            }
            case "wireLine": {
                const fpIds = deleteTarget.wire.fixingPoints.map((fp) => fp.id);
                fixingPointsStore.removeMany(fpIds);
                wireLinesStore.remove(deleteTarget.wire.id);
                break;
            }
            case "fixingPoint": {
                deleteTarget.parent.removeFixingPoint(deleteTarget.fp.id);
                fixingPointsStore.remove(deleteTarget.fp.id);
                break;
            }
        }
        setDeleteTarget(null);
    };

    const bulkAvailablePoles = bulkFpSection ? getAvailablePoles(bulkFpSection, catenaryPoleStore.list) : [];

    return (
        <SidePanel title="Линии" onClose={() => uiPanelsStore.toggleLinesEditorPanel()} width={480}>
            <div>
                {/* ── Контактная сеть ── */}
                <CollapsibleSection
                    title="Контактная сеть"
                    level={0}
                    extra={
                        <ActionIcon
                            variant="subtle"
                            color="blue"
                            size="xs"
                            onClick={() => anchorSectionsStore.add(new AnchorSectionClass())}
                        >
                            +
                        </ActionIcon>
                    }
                >
                    {tracksWithSections.map((track) => (
                        <CollapsibleSection key={track.id} title={`Путь ${track.name}`} level={1}>
                            {byTrackId.get(track.id)!.map((section) => (
                                <AnchorSectionRow
                                    key={section.id}
                                    section={section}
                                    onBulkCreate={setBulkFpSection}
                                    onDelete={(s) => setDeleteTarget({ kind: "anchorSection", section: s })}
                                    onDeleteFp={(fp, parent) => setDeleteTarget({ kind: "fixingPoint", fp, parent })}
                                />
                            ))}
                        </CollapsibleSection>
                    ))}
                    {unbound && unbound.length > 0 && (
                        <CollapsibleSection title="Без привязки к путям" level={1}>
                            {unbound.map((section) => (
                                <AnchorSectionRow
                                    key={section.id}
                                    section={section}
                                    onBulkCreate={setBulkFpSection}
                                    onDelete={(s) => setDeleteTarget({ kind: "anchorSection", section: s })}
                                    onDeleteFp={(fp, parent) => setDeleteTarget({ kind: "fixingPoint", fp, parent })}
                                />
                            ))}
                        </CollapsibleSection>
                    )}
                    {anchorSectionsStore.list.length === 0 && (
                        <Text size="xs" c="dimmed">
                            Нет анкерных участков
                        </Text>
                    )}
                </CollapsibleSection>

                {/* ── ВЛ ── */}
                <CollapsibleSection
                    title="ВЛ"
                    level={0}
                    extra={
                        <ActionIcon
                            variant="subtle"
                            color="blue"
                            size="xs"
                            onClick={() => wireLinesStore.add(new WireLineClass({ wireType: "vl", fixingPoints: [] }))}
                        >
                            +
                        </ActionIcon>
                    }
                >
                    {wireLinesStore.list.map((wire) => (
                        <WireLineRow
                            key={wire.id}
                            wire={wire}
                            onDelete={(w) => setDeleteTarget({ kind: "wireLine", wire: w })}
                            onDeleteFp={(fp, parent) => setDeleteTarget({ kind: "fixingPoint", fp, parent })}
                        />
                    ))}
                    {wireLinesStore.list.length === 0 && (
                        <Text size="xs" c="dimmed">
                            Нет линий
                        </Text>
                    )}
                </CollapsibleSection>
            </div>

            <BulkFpModal
                section={bulkFpSection}
                availablePoles={bulkAvailablePoles}
                onConfirm={handleBulkCreateFps}
                onClose={() => setBulkFpSection(null)}
            />

            <Modal
                opened={deleteTarget !== null}
                onClose={() => setDeleteTarget(null)}
                title="Подтверждение удаления"
                size="sm"
                centered
            >
                <Text size="sm">{deleteTarget && getDeleteMessage(deleteTarget)}</Text>
                <Group justify="flex-end" mt="md">
                    <Button variant="default" size="xs" onClick={() => setDeleteTarget(null)}>
                        Отмена
                    </Button>
                    <Button color="red" size="xs" onClick={confirmDelete}>
                        Удалить
                    </Button>
                </Group>
            </Modal>
        </SidePanel>
    );
}

export const LinesEditorPanel = observer(LinesEditorPanelComponent);
