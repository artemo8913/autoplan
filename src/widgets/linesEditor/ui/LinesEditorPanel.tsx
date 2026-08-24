import { useState } from "react";
import { observer } from "mobx-react-lite";
import { ActionIcon, Text } from "@mantine/core";
import { SidePanel } from "@/shared/ui/SidePanel";

import type { AnchorSection, FixingPoint, WireLine } from "@/entities/catenaryPlanGraphic";
import { useServices, useStore } from "@/app";

import { WIRE_TYPE_LABELS } from "../lib/wireTypeLabels";
import { getBulkFpCandidates, type BulkFpCandidate } from "../lib/bulkFpCandidates";
import { AnchorSectionRow } from "./AnchorSectionRow";
import { BulkFpModal } from "./BulkFpModal";
import { CollapsibleSection } from "@/shared/ui/CollapsibleSection";
import { WireLineRow } from "./WireLineRow";

// ── Types ─────────────────────────────────────────────────────────────────────

type DeleteTarget =
    | { kind: "anchorSection"; section: AnchorSection }
    | { kind: "wireLine"; wire: WireLine }
    | { kind: "fixingPoint"; fp: FixingPoint; parent: AnchorSection | WireLine };

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDeleteMessage(target: DeleteTarget, junctionCount: number): string {
    switch (target.kind) {
        case "anchorSection": {
            const s = target.section;
            const poleRange = s.startPole && s.endPole ? ` №${s.startPole.name}–${s.endPole.name}` : "";
            const name = s.name || `${s.type}${poleRange}`;
            const junctions = junctionCount > 0 ? ` и ${junctionCount} сопряжений` : "";
            return `Удалить АУ «${name}»? Будут также удалены ${s.fixingPoints.length} точек фиксации${junctions}.`;
        }
        case "wireLine": {
            const w = target.wire;
            const typeLabel = WIRE_TYPE_LABELS[w.wireType] ?? w.wireType;
            const name = w.label ? `${typeLabel} (${w.label})` : typeLabel;
            return `Удалить линию «${name}»? Будут также удалены ${w.fixingPoints.length} точек фиксации.`;
        }
        case "fixingPoint":
            return `Удалить точку фиксации (${target.fp.supportLabel})?`;
    }
}

// ── LinesEditorPanel ──────────────────────────────────────────────────────────

function LinesEditorPanelComponent() {
    const {
        anchorSectionsStore,
        wireLinesStore,
        tracksStore,
        catenaryPoleStore,
        crossSpansStore,
        junctionsStore,
        uiPanelsStore,
        confirmDialogStore,
    } = useStore();
    const { linesService } = useServices();
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
    const handleBulkCreateFps = (section: AnchorSection, candidates: BulkFpCandidate[]) => {
        linesService.bulkAddFixingPoints(
            section,
            candidates.map((c) => ({ pole: c.pole, crossSpan: c.kind === "crossSpan" ? c.crossSpan : undefined })),
        );
        setBulkFpSection(null);
    };

    const requestDelete = async (target: DeleteTarget) => {
        const doomedJunctionCount =
            target.kind === "anchorSection" ? junctionsStore.listBySection(target.section.id).length : 0;

        const confirmed = await confirmDialogStore.ask({
            title: "Подтверждение удаления",
            message: getDeleteMessage(target, doomedJunctionCount),
            confirmLabel: "Удалить",
            danger: true,
        });

        if (!confirmed) {
            return;
        }

        switch (target.kind) {
            case "anchorSection":
                linesService.deleteAnchorSection(target.section);
                break;
            case "wireLine":
                linesService.deleteWireLine(target.wire);
                break;
            case "fixingPoint":
                linesService.deleteFixingPoint(target.fp, target.parent);
                break;
        }
    };

    const bulkCandidates = bulkFpSection
        ? getBulkFpCandidates(bulkFpSection, catenaryPoleStore.list, crossSpansStore.list)
        : [];

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
                            onClick={() => linesService.createAnchorSection()}
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
                                    onDelete={(s) => void requestDelete({ kind: "anchorSection", section: s })}
                                    onDeleteFp={(fp, parent) => void requestDelete({ kind: "fixingPoint", fp, parent })}
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
                                    onDelete={(s) => void requestDelete({ kind: "anchorSection", section: s })}
                                    onDeleteFp={(fp, parent) => void requestDelete({ kind: "fixingPoint", fp, parent })}
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
                            onClick={() => linesService.createWireLine()}
                        >
                            +
                        </ActionIcon>
                    }
                >
                    {wireLinesStore.list.map((wire) => (
                        <WireLineRow
                            key={wire.id}
                            wire={wire}
                            onDelete={(w) => void requestDelete({ kind: "wireLine", wire: w })}
                            onDeleteFp={(fp, parent) => void requestDelete({ kind: "fixingPoint", fp, parent })}
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
                candidates={bulkCandidates}
                onConfirm={handleBulkCreateFps}
                onClose={() => setBulkFpSection(null)}
            />
        </SidePanel>
    );
}

export const LinesEditorPanel = observer(LinesEditorPanelComponent);
