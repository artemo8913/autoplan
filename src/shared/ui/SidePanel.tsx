import type { FC, ReactNode } from "react";
import { ActionIcon, Group, Text } from "@mantine/core";

import styles from "./SidePanel.module.css";

interface SidePanelProps {
    title: ReactNode;
    onClose: () => void;
    children: ReactNode;
    width?: number;
    /** Дополнительные элементы управления рядом с кнопкой закрытия */
    headerExtra?: ReactNode;
}

export const SidePanel: FC<SidePanelProps> = ({ title, onClose, children, width, headerExtra }) => (
    <div className={styles.panel} style={width != null ? { width } : undefined}>
        <div className={styles.panel__header}>
            <Text fw={600} size="sm">
                {title}
            </Text>
            <Group gap={4}>
                {headerExtra}
                <ActionIcon variant="subtle" color="gray" size="sm" onClick={onClose} aria-label="Закрыть">
                    ✕
                </ActionIcon>
            </Group>
        </div>
        <div className={styles.panel__body}>{children}</div>
    </div>
);
