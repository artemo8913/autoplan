import React, { useState } from "react";
import { observer } from "mobx-react-lite";
import { ActionIcon, Box, Button, Checkbox, Group, Modal, NumberInput, Select, Text, TextInput } from "@mantine/core";

import { CatenaryType } from "@/shared/types/catenaryTypes";
import type { WireType } from "@/shared/types/catenaryTypes";
import { WIRE_TYPE_LABELS } from "@/shared/lib/wireTypeLabels";
import type { CatenaryPole } from "@/entities/catenaryPlanGraphic";
import { AnchorSection, FixingPoint, WireLine } from "@/entities/catenaryPlanGraphic";
import { useStore } from "@/app";

import styles from "./LinesEditorPanel.module.css";

// ── Types ────────────────────────────────────────────────────────────────────

type DeleteTarget =
    | { kind: "anchorSection"; section: AnchorSection }
    | { kind: "wireLine"; wire: WireLine }
    | { kind: "fixingPoint"; fp: FixingPoint; parent: AnchorSection | WireLine };

type SelectData = Array<{ value: string; label: string }>;

// ── CollapsibleSection ───────────────────────────────────────────────────────

interface CollapsibleSectionProps {
    title: React.ReactNode;
    defaultOpen?: boolean;
    level?: number;
    extra?: React.ReactNode;
    children: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
    title,
    defaultOpen = true,
    level = 0,
    extra,
    children,
}) => {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div>
            <div className={styles.section__header}>
                <div className={styles.section__toggle} onClick={() => setOpen((v) => !v)}>
                    <span className={styles.section__chevron} data-open={open}>
                        ▸
                    </span>
                    {typeof title === "string" ? (
                        <Text size={level === 0 ? "sm" : "xs"} fw={level === 0 ? 600 : 500}>
                            {title}
                        </Text>
                    ) : (
                        title
                    )}
                </div>
                {extra}
            </div>
            {open && <div className={styles.section__children}>{children}</div>}
        </div>
    );
};

// ── CatenaryFpRow (КС: путь + зигзаг + ↑↓ + вставка + удаление) ────────────

interface CatenaryFpRowProps {
    fp: FixingPoint;
    index: number;
    total: number;
    trackSelectData: SelectData;
    onTrackChange: (fp: FixingPoint, trackId: string | null) => void;
    onMove: (fp: FixingPoint, direction: "up" | "down") => void;
    onInsertAfter: (fpId: string) => void;
    onDelete: (fp: FixingPoint) => void;
}

const CatenaryFpRow: React.FC<CatenaryFpRowProps> = observer(
    ({ fp, index, total, trackSelectData, onTrackChange, onMove, onInsertAfter, onDelete }) => (
        <div className={styles.fpRow}>
            <Text size="xs" c="dimmed" className={styles.fpRow__name}>
                {fp.pole.name}
            </Text>
            <Select
                size="xs"
                data={trackSelectData}
                value={fp.track?.id ?? "__none__"}
                onChange={(v) => onTrackChange(fp, v)}
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
                    onClick={() => onMove(fp, "up")}
                    disabled={index === 0}
                >
                    ▴
                </ActionIcon>
                <ActionIcon
                    variant="subtle"
                    color="gray"
                    size={14}
                    onClick={() => onMove(fp, "down")}
                    disabled={index === total - 1}
                >
                    ▾
                </ActionIcon>
            </div>
            <ActionIcon variant="subtle" color="blue" size="xs" onClick={() => onInsertAfter(fp.id)}>
                +
            </ActionIcon>
            <ActionIcon variant="subtle" color="red" size="xs" onClick={() => onDelete(fp)}>
                ✕
            </ActionIcon>
        </div>
    ),
);

// ── WireFpRow (ВЛ: смещение + ↑↓ + вставка + удаление) ─────────────────────

interface WireFpRowProps {
    fp: FixingPoint;
    index: number;
    total: number;
    onMove: (fp: FixingPoint, direction: "up" | "down") => void;
    onInsertAfter: (fpId: string) => void;
    onDelete: (fp: FixingPoint) => void;
}

const WireFpRow: React.FC<WireFpRowProps> = observer(({ fp, index, total, onMove, onInsertAfter, onDelete }) => (
    <div className={styles.fpRow}>
        <Text size="xs" c="dimmed" className={styles.fpRow__name}>
            {fp.pole.name}
        </Text>
        <NumberInput
            size="xs"
            value={fp.yOffset}
            onChange={(v) => {
                if (typeof v === "number") {
                    fp.setYOffset(v);
                }
            }}
            placeholder="смещ."
            step={1}
            className={styles.fpRow__input}
        />
        <div className={styles.fpRow__arrows}>
            <ActionIcon variant="subtle" color="gray" size={14} onClick={() => onMove(fp, "up")} disabled={index === 0}>
                ▴
            </ActionIcon>
            <ActionIcon
                variant="subtle"
                color="gray"
                size={14}
                onClick={() => onMove(fp, "down")}
                disabled={index === total - 1}
            >
                ▾
            </ActionIcon>
        </div>
        <ActionIcon variant="subtle" color="blue" size="xs" onClick={() => onInsertAfter(fp.id)}>
            +
        </ActionIcon>
        <ActionIcon variant="subtle" color="red" size="xs" onClick={() => onDelete(fp)}>
            ✕
        </ActionIcon>
    </div>
));

// ── AddFpRow (строка добавления ТФ) ─────────────────────────────────────────

interface AddFpRowProps {
    poleSelectData: SelectData;
    trackSelectData?: SelectData;
    defaultTrackId?: string;
    onAdd: (poleId: string, trackId?: string) => void;
}

const AddFpRow: React.FC<AddFpRowProps> = ({ poleSelectData, trackSelectData, defaultTrackId, onAdd }) => {
    const [poleId, setPoleId] = useState<string | null>(null);
    const [trackId, setTrackId] = useState<string | null>(defaultTrackId ?? null);

    const handleAdd = () => {
        if (poleId) {
            onAdd(poleId, trackId && trackId !== "__none__" ? trackId : undefined);
            setPoleId(null);
            setTrackId(defaultTrackId ?? null);
        }
    };

    return (
        <div className={styles.addFpRow}>
            <Select
                size="xs"
                data={poleSelectData}
                value={poleId}
                onChange={setPoleId}
                searchable
                placeholder="опора"
                className={styles.addFpRow__select}
            />
            {trackSelectData && (
                <Select
                    size="xs"
                    data={trackSelectData}
                    value={trackId ?? "__none__"}
                    onChange={setTrackId}
                    placeholder="путь"
                    className={styles.addFpRow__select}
                />
            )}
            <ActionIcon variant="subtle" color="blue" size="xs" onClick={handleAdd} disabled={!poleId}>
                +
            </ActionIcon>
        </div>
    );
};

// ── Select data ──────────────────────────────────────────────────────────────

const CATENARY_TYPE_DATA = Object.values(CatenaryType).map((v) => ({ value: v, label: v }));
const WIRE_TYPE_DATA = Object.entries(WIRE_TYPE_LABELS).map(([value, label]) => ({ value, label }));

// ── Bulk FP helpers ─────────────────────────────────────────────────────────

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

// ── AnchorSectionRow ─────────────────────────────────────────────────────────

interface AnchorSectionRowProps {
    section: AnchorSection;
    poleSelectData: SelectData;
    trackSelectData: SelectData;
    onTrackChange: (section: AnchorSection, trackId: string | null) => void;
    onPoleChange: (section: AnchorSection, which: "start" | "end", poleId: string | null) => void;
    onFpTrackChange: (fp: FixingPoint, trackId: string | null) => void;
    onAddFp: (section: AnchorSection, poleId: string, trackId?: string) => void;
    onInsertFpAfter: (section: AnchorSection, afterFpId: string, poleId: string, trackId?: string) => void;
    onBulkCreate: (section: AnchorSection) => void;
    onDelete: (section: AnchorSection) => void;
    onDeleteFp: (fp: FixingPoint, parent: AnchorSection) => void;
}

const AnchorSectionRow: React.FC<AnchorSectionRowProps> = observer(
    ({
        section,
        poleSelectData,
        trackSelectData,
        onTrackChange,
        onPoleChange,
        onFpTrackChange,
        onAddFp,
        onInsertFpAfter,
        onBulkCreate,
        onDelete,
        onDeleteFp,
    }) => {
        const [insertAfterId, setInsertAfterId] = useState<string | null>(null);

        const poleRange =
            section.startPole && section.endPole ? `№${section.startPole.name}–${section.endPole.name}` : "";
        const displayName = section.name || (poleRange ? `${section.type} ${poleRange}` : section.type);
        const canBulk = !!(section.startPole && section.endPole && section.primaryTrack);
        const defaultTrackId = section.primaryTrack?.id;

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
                {/* ── Редактируемые поля АУ ── */}
                <div className={styles.fields}>
                    <TextInput
                        size="xs"
                        label="Наименование"
                        value={section.name}
                        onChange={(e) => section.setName(e.target.value)}
                    />
                    <Select
                        size="xs"
                        label="Тип"
                        data={CATENARY_TYPE_DATA}
                        value={section.type}
                        onChange={(v) => {
                            if (v) {
                                section.setType(v as CatenaryType);
                            }
                        }}
                    />
                    <Select
                        size="xs"
                        label="Начальная опора"
                        data={poleSelectData}
                        value={section.startPole?.id ?? null}
                        onChange={(v) => onPoleChange(section, "start", v)}
                        searchable
                        clearable
                        placeholder="не задана"
                    />
                    <Select
                        size="xs"
                        label="Конечная опора"
                        data={poleSelectData}
                        value={section.endPole?.id ?? null}
                        onChange={(v) => onPoleChange(section, "end", v)}
                        searchable
                        clearable
                        placeholder="не задана"
                    />
                    <Select
                        size="xs"
                        label="Путь"
                        data={trackSelectData}
                        value={section.primaryTrack?.id ?? "__none__"}
                        onChange={(v) => onTrackChange(section, v)}
                    />
                </div>

                {/* ── Точки фиксации ── */}
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
                                trackSelectData={trackSelectData}
                                onTrackChange={onFpTrackChange}
                                onMove={(f, dir) => section.moveFixingPoint(f.id, dir)}
                                onInsertAfter={(fpId) => setInsertAfterId(insertAfterId === fpId ? null : fpId)}
                                onDelete={(f) => onDeleteFp(f, section)}
                            />
                            {insertAfterId === fp.id && (
                                <AddFpRow
                                    poleSelectData={poleSelectData}
                                    trackSelectData={trackSelectData}
                                    defaultTrackId={defaultTrackId}
                                    onAdd={(poleId, trackId) => {
                                        onInsertFpAfter(section, insertAfterId, poleId, trackId);
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
                        onAdd={(poleId, trackId) => onAddFp(section, poleId, trackId)}
                    />
                </CollapsibleSection>
            </CollapsibleSection>
        );
    },
);

// ── WireLineRow ──────────────────────────────────────────────────────────────

interface WireLineRowProps {
    wire: WireLine;
    allPoleSelectData: SelectData;
    onAddFp: (wire: WireLine, poleId: string) => void;
    onInsertFpAfter: (wire: WireLine, afterFpId: string, poleId: string) => void;
    onDelete: (wire: WireLine) => void;
    onDeleteFp: (fp: FixingPoint, parent: WireLine) => void;
}

const WireLineRow: React.FC<WireLineRowProps> = observer(
    ({ wire, allPoleSelectData, onAddFp, onInsertFpAfter, onDelete, onDeleteFp }) => {
        const [insertAfterId, setInsertAfterId] = useState<string | null>(null);
        const typeLabel = WIRE_TYPE_LABELS[wire.wireType] ?? wire.wireType;
        const displayName = wire.label ? `${typeLabel} (${wire.label})` : typeLabel;

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
                {/* ── Редактируемые поля ВЛ ── */}
                <div className={styles.fields}>
                    <Select
                        size="xs"
                        label="Тип"
                        data={WIRE_TYPE_DATA}
                        value={wire.wireType}
                        onChange={(v) => {
                            if (v) {
                                wire.setWireType(v as WireType);
                            }
                        }}
                    />
                    <TextInput
                        size="xs"
                        label="Метка"
                        value={wire.label ?? ""}
                        onChange={(e) => wire.setLabel(e.target.value || undefined)}
                    />
                </div>

                {/* ── Точки фиксации ── */}
                <CollapsibleSection title="Точки фиксации" defaultOpen={false} level={2}>
                    {wire.fixingPoints.map((fp, i) => (
                        <React.Fragment key={fp.id}>
                            <WireFpRow
                                fp={fp}
                                index={i}
                                total={wire.fixingPoints.length}
                                onMove={(f, dir) => wire.moveFixingPoint(f.id, dir)}
                                onInsertAfter={(fpId) => setInsertAfterId(insertAfterId === fpId ? null : fpId)}
                                onDelete={(f) => onDeleteFp(f, wire)}
                            />
                            {insertAfterId === fp.id && (
                                <AddFpRow
                                    poleSelectData={allPoleSelectData}
                                    onAdd={(poleId) => {
                                        onInsertFpAfter(wire, insertAfterId, poleId);
                                        setInsertAfterId(null);
                                    }}
                                />
                            )}
                        </React.Fragment>
                    ))}
                    <AddFpRow poleSelectData={allPoleSelectData} onAdd={(poleId) => onAddFp(wire, poleId)} />
                </CollapsibleSection>
            </CollapsibleSection>
        );
    },
);

// ── Confirmation Modal helpers ───────────────────────────────────────────────

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

// ── BulkFpModal ─────────────────────────────────────────────────────────────

interface BulkFpModalProps {
    section: AnchorSection | null;
    availablePoles: CatenaryPole[];
    onConfirm: (section: AnchorSection, poleIds: string[]) => void;
    onClose: () => void;
}

function BulkFpModalComponent({ section, availablePoles, onConfirm, onClose }: BulkFpModalProps) {
    const [unchecked, setUnchecked] = useState<Set<string>>(new Set());

    const handleToggle = (poleId: string) => {
        setUnchecked((prev) => {
            const next = new Set(prev);
            if (next.has(poleId)) {
                next.delete(poleId);
            } else {
                next.add(poleId);
            }
            return next;
        });
    };

    const handleConfirm = () => {
        if (!section) {
            return;
        }
        const poleIds = availablePoles.filter((p) => !unchecked.has(p.id)).map((p) => p.id);
        onConfirm(section, poleIds);
        setUnchecked(new Set());
    };

    const handleClose = () => {
        setUnchecked(new Set());
        onClose();
    };

    const checkedCount = availablePoles.length - unchecked.size;

    return (
        <Modal opened={section !== null} onClose={handleClose} title="Массовое создание ТФ" size="sm" centered>
            {section && (
                <>
                    <Text size="xs" c="dimmed" mb="xs">
                        Путь: {section.primaryTrack?.name ?? "—"} | Диапазон: №{section.startPole?.name} – №
                        {section.endPole?.name}
                    </Text>
                    {availablePoles.length === 0 ? (
                        <Text size="sm" c="dimmed">
                            Все опоры в диапазоне уже имеют ТФ
                        </Text>
                    ) : (
                        <div className={styles.bulkList}>
                            {availablePoles.map((pole) => (
                                <Checkbox
                                    key={pole.id}
                                    size="xs"
                                    label={`№${pole.name}`}
                                    checked={!unchecked.has(pole.id)}
                                    onChange={() => handleToggle(pole.id)}
                                />
                            ))}
                        </div>
                    )}
                    <Group justify="flex-end" mt="md">
                        <Button variant="default" size="xs" onClick={handleClose}>
                            Отмена
                        </Button>
                        <Button size="xs" onClick={handleConfirm} disabled={checkedCount === 0}>
                            Создать ({checkedCount})
                        </Button>
                    </Group>
                </>
            )}
        </Modal>
    );
}

const BulkFpModal = observer(BulkFpModalComponent);

// ── LinesEditorPanel ─────────────────────────────────────────────────────────

function LinesEditorPanelComponent() {
    const {
        anchorSectionsStore,
        wireLinesStore,
        fixingPointsStore,
        tracksStore,
        polesStore,
        vlPolesStore,
        uiPanelsStore,
    } = useStore();
    const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
    const [bulkFpSection, setBulkFpSection] = useState<AnchorSection | null>(null);

    if (!uiPanelsStore.isOpenLinesEditorPanel) {
        return null;
    }

    // ── Select data ─────────────────────────────────────────────────────────
    const trackSelectData: SelectData = [
        { value: "__none__", label: "(нет)" },
        ...tracksStore.list.map((t) => ({ value: t.id, label: `Путь ${t.name}` })),
    ];

    const poleSelectData: SelectData = polesStore.list.map((p) => ({ value: p.id, label: `№${p.name}` }));

    const allPoleSelectData: SelectData = [
        ...poleSelectData,
        ...vlPolesStore.list.map((p) => ({ value: p.id, label: `${p.name} (ВЛ)` })),
    ];

    // ── Группировка АУ по primaryTrack ───────────────────────────────────────
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

    // ── Handlers ─────────────────────────────────────────────────────────────
    const handleTrackChange = (section: AnchorSection, trackId: string | null) => {
        const track = trackId && trackId !== "__none__" ? tracksStore.tracks.get(trackId) : undefined;
        section.setPrimaryTrack(track);
    };

    const handlePoleChange = (section: AnchorSection, which: "start" | "end", poleId: string | null) => {
        const pole = poleId ? polesStore.poles.get(poleId) : undefined;
        if (which === "start") {
            section.setStartPole(pole);
        } else {
            section.setEndPole(pole);
        }
    };

    const handleFpTrackChange = (fp: FixingPoint, trackId: string | null) => {
        const track = trackId && trackId !== "__none__" ? tracksStore.tracks.get(trackId) : undefined;
        fp.setTrack(track);
    };

    const handleAddCatenaryFp = (section: AnchorSection, poleId: string, trackId?: string) => {
        const pole = polesStore.poles.get(poleId);
        if (!pole) {
            return;
        }
        const track = trackId ? tracksStore.tracks.get(trackId) : undefined;
        const fp = new FixingPoint({ pole, track });
        section.addFixingPoint(fp);
        fixingPointsStore.add(fp);
    };

    const handleInsertCatenaryFpAfter = (
        section: AnchorSection,
        afterFpId: string,
        poleId: string,
        trackId?: string,
    ) => {
        const pole = polesStore.poles.get(poleId);
        if (!pole) {
            return;
        }
        const track = trackId ? tracksStore.tracks.get(trackId) : undefined;
        const fp = new FixingPoint({ pole, track });
        section.insertFixingPointAfter(afterFpId, fp);
        fixingPointsStore.add(fp);
    };

    const handleAddWireFp = (wire: WireLine, poleId: string) => {
        const pole = polesStore.poles.get(poleId) ?? vlPolesStore.vlPoles.get(poleId);
        if (!pole) {
            return;
        }
        const fp = new FixingPoint({ pole, yOffset: 0 });
        wire.addFixingPoint(fp);
        fixingPointsStore.add(fp);
    };

    const handleInsertWireFpAfter = (wire: WireLine, afterFpId: string, poleId: string) => {
        const pole = polesStore.poles.get(poleId) ?? vlPolesStore.vlPoles.get(poleId);
        if (!pole) {
            return;
        }
        const fp = new FixingPoint({ pole, yOffset: 0 });
        wire.insertFixingPointAfter(afterFpId, fp);
        fixingPointsStore.add(fp);
    };

    const handleCreateAS = () => {
        const section = new AnchorSection();
        anchorSectionsStore.add(section);
    };

    const handleCreateWL = () => {
        const wire = new WireLine({ wireType: "vl", fixingPoints: [] });
        wireLinesStore.add(wire);
    };

    const handleBulkCreateFps = (section: AnchorSection, poleIds: string[]) => {
        for (const poleId of poleIds) {
            const pole = polesStore.poles.get(poleId);
            if (!pole) {
                continue;
            }
            const fp = new FixingPoint({ pole, track: section.primaryTrack });
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

    const bulkAvailablePoles = bulkFpSection ? getAvailablePoles(bulkFpSection, polesStore.list) : [];

    return (
        <Box className={styles.panel}>
            <Group justify="space-between" className={styles.panel__header}>
                <Text fw={600} size="sm">
                    Линии
                </Text>
                <ActionIcon
                    variant="subtle"
                    color="gray"
                    size="sm"
                    onClick={() => uiPanelsStore.toggleLinesEditorPanel()}
                    aria-label="Закрыть"
                >
                    ✕
                </ActionIcon>
            </Group>

            <div className={styles.panel__body}>
                {/* ── Контактная сеть ── */}
                <CollapsibleSection
                    title="Контактная сеть"
                    level={0}
                    extra={
                        <ActionIcon variant="subtle" color="blue" size="xs" onClick={handleCreateAS}>
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
                                    poleSelectData={poleSelectData}
                                    trackSelectData={trackSelectData}
                                    onTrackChange={handleTrackChange}
                                    onPoleChange={handlePoleChange}
                                    onFpTrackChange={handleFpTrackChange}
                                    onAddFp={handleAddCatenaryFp}
                                    onInsertFpAfter={handleInsertCatenaryFpAfter}
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
                                    poleSelectData={poleSelectData}
                                    trackSelectData={trackSelectData}
                                    onTrackChange={handleTrackChange}
                                    onPoleChange={handlePoleChange}
                                    onFpTrackChange={handleFpTrackChange}
                                    onAddFp={handleAddCatenaryFp}
                                    onInsertFpAfter={handleInsertCatenaryFpAfter}
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
                        <ActionIcon variant="subtle" color="blue" size="xs" onClick={handleCreateWL}>
                            +
                        </ActionIcon>
                    }
                >
                    {wireLinesStore.list.map((wire) => (
                        <WireLineRow
                            key={wire.id}
                            wire={wire}
                            allPoleSelectData={allPoleSelectData}
                            onAddFp={handleAddWireFp}
                            onInsertFpAfter={handleInsertWireFpAfter}
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

            {/* ── Модальное массовое создание ТФ ── */}
            <BulkFpModal
                section={bulkFpSection}
                availablePoles={bulkAvailablePoles}
                onConfirm={handleBulkCreateFps}
                onClose={() => setBulkFpSection(null)}
            />

            {/* ── Модальное подтверждение удаления ── */}
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
        </Box>
    );
}

export const LinesEditorPanel = observer(LinesEditorPanelComponent);
