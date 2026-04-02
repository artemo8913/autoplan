import React, { useState, useCallback } from "react";
import { observer } from "mobx-react-lite";
import {
    ActionIcon,
    Button,
    Group,
    Modal,
    SegmentedControl,
    Select,
    Stack,
    Text,
    TextInput,
} from "@mantine/core";

import type { JunctionType } from "@/shared/types/catenaryTypes";
import { Junction } from "@/entities/catenaryPlanGraphic";
import type { AnchorSection } from "@/entities/catenaryPlanGraphic";
import { SidePanel } from "@/shared/ui/SidePanel";
import { useStore } from "@/app";

import { detectJunctions } from "../lib/detectJunctions";
import styles from "./JunctionsEditorPanel.module.css";

// ── Константы ─────────────────────────────────────────────────────────────────

const JUNCTION_TYPE_DATA = [
    { value: "non-insulating", label: "Неизол." },
    { value: "insulating", label: "Изол." },
];

function junctionDisplayName(j: Junction): string {
    if (j.name) return j.name;
    const s1 = j.section1.name || "АУ";
    const s2 = j.section2.name || "АУ";
    return `${s1} ↔ ${s2}`;
}

// ── JunctionRow ───────────────────────────────────────────────────────────────

interface JunctionRowProps {
    junction: Junction;
    onDelete: (j: Junction) => void;
}

const JunctionRow: React.FC<JunctionRowProps> = observer(({ junction, onDelete }) => {
    const overlapRange = junction.overlapXRange;
    const overlapText = overlapRange
        ? `x: ${overlapRange.start}–${overlapRange.end}`
        : "нет перекрытия";

    return (
        <div className={styles.junctionRow}>
            <Group justify="space-between" align="flex-start" gap="xs" wrap="nowrap">
                <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                    <TextInput
                        size="xs"
                        placeholder={junctionDisplayName(junction)}
                        value={junction.name}
                        onChange={(e) => junction.setName(e.target.value)}
                    />
                    <SegmentedControl
                        size="xs"
                        data={JUNCTION_TYPE_DATA}
                        value={junction.type}
                        onChange={(v) => junction.setType(v as JunctionType)}
                    />
                    <Text size="xs" c="dimmed">
                        {junction.section1.name || "АУ-?"} ↔ {junction.section2.name || "АУ-?"} ({overlapText})
                    </Text>
                </Stack>
                <ActionIcon
                    variant="subtle"
                    color="red"
                    size="sm"
                    title="Удалить сопряжение"
                    onClick={() => onDelete(junction)}
                >
                    ✕
                </ActionIcon>
            </Group>
        </div>
    );
});

JunctionRow.displayName = "JunctionRow";

// ── CreateJunctionForm ──────────────────────────────────────────────────────────

interface CreateJunctionFormProps {
    sections: AnchorSection[];
    onCreate: (section1Id: string, section2Id: string, type: JunctionType) => void;
    onCancel: () => void;
}

const CreateJunctionForm: React.FC<CreateJunctionFormProps> = ({ sections, onCreate, onCancel }) => {
    const [section1Id, setSection1Id] = useState<string | null>(null);
    const [section2Id, setSection2Id] = useState<string | null>(null);
    const [type, setType] = useState<JunctionType>("non-insulating");

    const sectionData = sections.map((s) => ({
        value: s.id,
        label: s.name || `АУ (${s.startPole?.name ?? "?"}–${s.endPole?.name ?? "?"})`,
    }));

    const canCreate = section1Id && section2Id && section1Id !== section2Id;

    return (
        <div className={styles.createForm}>
            <Text size="xs" fw={500}>
                Новое сопряжение
            </Text>
            <Select
                size="xs"
                label="Секция 1"
                placeholder="Выберите АУ"
                data={sectionData}
                value={section1Id}
                onChange={setSection1Id}
                searchable
            />
            <Select
                size="xs"
                label="Секция 2"
                placeholder="Выберите АУ"
                data={sectionData}
                value={section2Id}
                onChange={setSection2Id}
                searchable
            />
            <SegmentedControl
                size="xs"
                data={JUNCTION_TYPE_DATA}
                value={type}
                onChange={(v) => setType(v as JunctionType)}
            />
            <Group gap="xs">
                <Button size="xs" disabled={!canCreate} onClick={() => onCreate(section1Id!, section2Id!, type)}>
                    Добавить
                </Button>
                <Button size="xs" variant="subtle" color="gray" onClick={onCancel}>
                    Отмена
                </Button>
            </Group>
        </div>
    );
};

// ── JunctionsEditorPanel ────────────────────────────────────────────────────────

export const JunctionsEditorPanel: React.FC = observer(() => {
    const { junctionsStore, anchorSectionsStore, uiPanelsStore } = useStore();
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Junction | null>(null);
    const [confirmAutoDetect, setConfirmAutoDetect] = useState(false);

    const handleClose = useCallback(() => {
        uiPanelsStore.toggleJunctionsEditorPanel();
    }, [uiPanelsStore]);

    const handleAutoDetect = useCallback(() => {
        if (junctionsStore.list.length > 0) {
            setConfirmAutoDetect(true);
            return;
        }
        runAutoDetect();
    }, [junctionsStore, anchorSectionsStore]);

    const runAutoDetect = useCallback(() => {
        junctionsStore.clear();
        const detected = detectJunctions(anchorSectionsStore.list);
        for (const j of detected) {
            junctionsStore.add(j);
        }
        setConfirmAutoDetect(false);
    }, [junctionsStore, anchorSectionsStore]);

    const handleCreate = useCallback(
        (section1Id: string, section2Id: string, type: JunctionType) => {
            const section1 = anchorSectionsStore.anchorSections.get(section1Id);
            const section2 = anchorSectionsStore.anchorSections.get(section2Id);
            if (!section1 || !section2) return;

            const [s1, s2] =
                (section1.startPole?.x ?? 0) <= (section2.startPole?.x ?? 0)
                    ? [section1, section2]
                    : [section2, section1];

            const junction = new Junction({ section1: s1, section2: s2, type });
            junctionsStore.add(junction);
            setShowCreateForm(false);
        },
        [anchorSectionsStore, junctionsStore],
    );

    const handleDelete = useCallback(
        (junction: Junction) => {
            setDeleteTarget(junction);
        },
        [],
    );

    const confirmDelete = useCallback(() => {
        if (deleteTarget) {
            junctionsStore.remove(deleteTarget.id);
            setDeleteTarget(null);
        }
    }, [deleteTarget, junctionsStore]);

    if (!uiPanelsStore.isOpenJunctionsEditorPanel) {
        return null;
    }

    const junctions = junctionsStore.list;
    const hasSections = anchorSectionsStore.list.length >= 2;

    return (
        <SidePanel title="Сопряжения" onClose={handleClose} width={420}>
            <Stack gap="sm">
                {/* ── Кнопки действий ── */}
                <Group gap="xs">
                    <Button
                        size="xs"
                        variant="light"
                        onClick={handleAutoDetect}
                        disabled={!hasSections}
                        title="Автоматически определить сопряжения по общим опорам между АУ"
                    >
                        Определить сопряжения
                    </Button>
                    <Button
                        size="xs"
                        variant="subtle"
                        onClick={() => setShowCreateForm(true)}
                        disabled={!hasSections || showCreateForm}
                    >
                        + Создать
                    </Button>
                </Group>

                {/* ── Форма создания ── */}
                {showCreateForm && (
                    <CreateJunctionForm
                        sections={anchorSectionsStore.list}
                        onCreate={handleCreate}
                        onCancel={() => setShowCreateForm(false)}
                    />
                )}

                {/* ── Список сопряжений ── */}
                {junctions.length === 0 && (
                    <Text size="xs" c="dimmed" fs="italic">
                        Сопряжений нет
                    </Text>
                )}

                {junctions.map((j) => (
                    <JunctionRow key={j.id} junction={j} onDelete={handleDelete} />
                ))}
            </Stack>

            {/* ── Модал подтверждения удаления ── */}
            <Modal
                opened={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                title="Удалить сопряжение?"
                size="sm"
            >
                <Text size="sm">
                    Удалить сопряжение «{deleteTarget ? junctionDisplayName(deleteTarget) : ""}»?
                </Text>
                <Group justify="flex-end" mt="md">
                    <Button variant="subtle" onClick={() => setDeleteTarget(null)}>
                        Отмена
                    </Button>
                    <Button color="red" onClick={confirmDelete}>
                        Удалить
                    </Button>
                </Group>
            </Modal>

            {/* ── Модал подтверждения авто-определения ── */}
            <Modal
                opened={confirmAutoDetect}
                onClose={() => setConfirmAutoDetect(false)}
                title="Определить сопряжения"
                size="sm"
            >
                <Text size="sm">
                    Существующие сопряжения ({junctionsStore.list.length} шт.) будут удалены и заменены
                    автоматически определёнными. Продолжить?
                </Text>
                <Group justify="flex-end" mt="md">
                    <Button variant="subtle" onClick={() => setConfirmAutoDetect(false)}>
                        Отмена
                    </Button>
                    <Button color="blue" onClick={runAutoDetect}>
                        Определить
                    </Button>
                </Group>
            </Modal>
        </SidePanel>
    );
});

JunctionsEditorPanel.displayName = "JunctionsEditorPanel";
