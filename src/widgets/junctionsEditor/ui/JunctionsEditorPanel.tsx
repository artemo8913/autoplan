import React, { useState, useCallback } from "react";
import { observer } from "mobx-react-lite";
import { Button, Group, Modal, Stack, Text } from "@mantine/core";

import { SidePanel } from "@/shared/ui/SidePanel";
import type { JunctionType } from "@/shared/types/catenaryTypes";
import { Junction } from "@/entities/catenaryPlanGraphic";
import { useStore } from "@/app";

import { CreateJunctionForm } from "./CreateJunctionForm";
import { JunctionTableRow } from "./JunctionTableRow";
import { detectJunctions } from "../lib/detectJunctions";
import { junctionDisplayName } from "../lib/junctionDisplayName";

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

            if (!section1 || !section2) {
                return;
            }

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

    const handleDelete = useCallback((junction: Junction) => {
        setDeleteTarget(junction);
    }, []);

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
                    <JunctionTableRow key={j.id} junction={j} onDelete={handleDelete} />
                ))}
            </Stack>

            <Modal opened={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Удалить сопряжение?" size="sm">
                <Text size="sm">Удалить сопряжение «{deleteTarget ? junctionDisplayName(deleteTarget) : ""}»?</Text>
                <Group justify="flex-end" mt="md">
                    <Button variant="subtle" onClick={() => setDeleteTarget(null)}>
                        Отмена
                    </Button>
                    <Button color="red" onClick={confirmDelete}>
                        Удалить
                    </Button>
                </Group>
            </Modal>

            <Modal
                opened={confirmAutoDetect}
                onClose={() => setConfirmAutoDetect(false)}
                title="Определить сопряжения"
                size="sm"
            >
                <Text size="sm">
                    Существующие сопряжения ({junctionsStore.list.length} шт.) будут удалены и заменены автоматически
                    определёнными. Продолжить?
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
