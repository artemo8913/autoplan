import { useState } from "react";
import { observer } from "mobx-react-lite";
import { Button, Checkbox, Group, Modal, Text } from "@mantine/core";

import type { AnchorSection } from "@/entities/catenaryPlanGraphic";

import type { BulkFpCandidate } from "../lib/bulkFpCandidates";
import styles from "./LinesEditorPanel.module.css";

interface BulkFpModalProps {
    section: AnchorSection | null;
    candidates: BulkFpCandidate[];
    onConfirm: (section: AnchorSection, candidates: BulkFpCandidate[]) => void;
    onClose: () => void;
}

function BulkFpModalComponent({ section, candidates, onConfirm, onClose }: BulkFpModalProps) {
    const [unchecked, setUnchecked] = useState<Set<string>>(new Set());

    const handleToggle = (key: string) => {
        setUnchecked((prev) => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    };

    const handleConfirm = () => {
        if (!section) {
            return;
        }
        const selected = candidates.filter((c) => !unchecked.has(c.key));
        onConfirm(section, selected);
        setUnchecked(new Set());
    };

    const handleClose = () => {
        setUnchecked(new Set());
        onClose();
    };

    const checkedCount = candidates.length - unchecked.size;

    return (
        <Modal opened={section !== null} onClose={handleClose} title="Массовое создание ТФ" size="sm" centered>
            {section && (
                <>
                    <Text size="xs" c="dimmed" mb="xs">
                        Путь: {section.primaryTrack?.name ?? "—"} | Диапазон: №{section.startPole?.name} – №
                        {section.endPole?.name}
                    </Text>
                    {candidates.length === 0 ? (
                        <Text size="sm" c="dimmed">
                            Нет опор или ригелей для создания ТФ в диапазоне
                        </Text>
                    ) : (
                        <div className={styles.bulkList}>
                            {candidates.map((c) => (
                                <Checkbox
                                    key={c.key}
                                    size="xs"
                                    label={c.label}
                                    checked={!unchecked.has(c.key)}
                                    onChange={() => handleToggle(c.key)}
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
