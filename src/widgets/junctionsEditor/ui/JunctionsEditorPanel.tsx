import React, { useState, useCallback } from "react";
import { observer } from "mobx-react-lite";
import { Button, Group, Stack, Text } from "@mantine/core";

import { SidePanel } from "@/shared/ui/SidePanel";
import type { JunctionType } from "@/shared/types/catenaryTypes";
import type { Junction } from "@/entities/catenaryPlanGraphic";
import { useServices, useStore } from "@/app";

import { CreateJunctionForm } from "./CreateJunctionForm";
import { JunctionTableRow } from "./JunctionTableRow";
import { junctionDisplayName } from "../lib/junctionDisplayName";

export const JunctionsEditorPanel: React.FC = observer(() => {
    const { junctionsStore, anchorSectionsStore, uiPanelsStore, confirmDialogStore } = useStore();
    const { junctionService } = useServices();
    const [showCreateForm, setShowCreateForm] = useState(false);

    const handleClose = useCallback(() => {
        uiPanelsStore.toggleJunctionsEditorPanel();
    }, [uiPanelsStore]);

    const handleAutoDetect = useCallback(async () => {
        const existingCount = junctionsStore.list.length;

        if (existingCount > 0) {
            const confirmed = await confirmDialogStore.ask({
                title: "Определить сопряжения",
                message: `Существующие сопряжения (${existingCount} шт.) будут заменены автоматически определёнными.`,
                details: ["Действие можно отменить (Ctrl+Z)"],
                confirmLabel: "Определить",
            });

            if (!confirmed) {
                return;
            }
        }

        junctionService.runAutoDetectJunctions();
    }, [confirmDialogStore, junctionService, junctionsStore]);

    const handleCreate = useCallback(
        (section1Id: string, section2Id: string, type: JunctionType) => {
            junctionService.createJunction(section1Id, section2Id, type);
            setShowCreateForm(false);
        },
        [junctionService],
    );

    const handleDelete = useCallback(
        async (junction: Junction) => {
            const confirmed = await confirmDialogStore.ask({
                title: "Удалить сопряжение?",
                message: `Сопряжение «${junctionDisplayName(junction)}» будет удалено.`,
                confirmLabel: "Удалить",
                danger: true,
            });

            if (confirmed) {
                junctionService.deleteJunction(junction);
            }
        },
        [confirmDialogStore, junctionService],
    );

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
                        onClick={() => void handleAutoDetect()}
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
                    <JunctionTableRow key={j.id} junction={j} onDelete={(junction) => void handleDelete(junction)} />
                ))}
            </Stack>
        </SidePanel>
    );
});

JunctionsEditorPanel.displayName = "JunctionsEditorPanel";
