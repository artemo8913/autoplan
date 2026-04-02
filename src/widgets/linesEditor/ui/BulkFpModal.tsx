import { useState } from "react";
import { observer } from "mobx-react-lite";
import { Button, Checkbox, Group, Modal, Text } from "@mantine/core";

import type { CatenaryPole, AnchorSection } from "@/entities/catenaryPlanGraphic";

import styles from "./LinesEditorPanel.module.css";

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
        if (!section) return;
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

export const BulkFpModal = observer(BulkFpModalComponent);
