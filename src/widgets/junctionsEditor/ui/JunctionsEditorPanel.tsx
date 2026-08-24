import React, { useState, useCallback } from "react";
import { observer } from "mobx-react-lite";
import { Button, Group, Modal, Stack, Text } from "@mantine/core";

import { SidePanel } from "@/shared/ui/SidePanel";
import type { JunctionType } from "@/shared/types/catenaryTypes";
import type { Junction } from "@/entities/catenaryPlanGraphic";
import { useServices, useStore } from "@/app";

import { CreateJunctionForm } from "./CreateJunctionForm";
import { JunctionTableRow } from "./JunctionTableRow";
import { junctionDisplayName } from "../lib/junctionDisplayName";

export const JunctionsEditorPanel: React.FC = observer(() => {
    const { junctionsStore, anchorSectionsStore, uiPanelsStore } = useStore();
    const { junctionService } = useServices();
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Junction | null>(null);
    const [confirmAutoDetect, setConfirmAutoDetect] = useState(false);

    const handleClose = useCallback(() => {
        uiPanelsStore.toggleJunctionsEditorPanel();
    }, [uiPanelsStore]);

    const runAutoDetect = useCallback(() => {
        junctionService.runAutoDetectJunctions();
        setConfirmAutoDetect(false);
    }, [junctionService]);

    const handleAutoDetect = useCallback(() => {
        if (junctionsStore.list.length > 0) {
            setConfirmAutoDetect(true);
            return;
        }

        runAutoDetect();
    }, [junctionsStore, runAutoDetect]);

    const handleCreate = useCallback(
        (section1Id: string, section2Id: string, type: JunctionType) => {
            junctionService.createJunction(section1Id, section2Id, type);
            setShowCreateForm(false);
        },
        [junctionService],
    );

    const handleDelete = useCallback((junction: Junction) => {
        setDeleteTarget(junction);
    }, []);

    const confirmDelete = useCallback(() => {
        if (deleteTarget) {
            junctionService.deleteJunction(deleteTarget);
            setDeleteTarget(null);
        }
    }, [deleteTarget, junctionService]);

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
