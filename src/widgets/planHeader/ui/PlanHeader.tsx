import React from "react";
import { observer } from "mobx-react-lite";
import { ActionIcon, Button, Group, Text, Tooltip } from "@mantine/core";

import { ImportPlanButton } from "@/features/plans/import";
import { ExportPlanButton } from "@/features/plans/export";
import { useStore, useServices } from "@/app";

import styles from "./PlanHeader.module.css";

export const PlanHeader: React.FC = observer(() => {
    const { appStore } = useStore();
    const { planService } = useServices();

    return (
        <Group px="md" py="xs" gap="sm" className={styles.header}>
            <Tooltip label="К списку планов" position="bottom">
                <ActionIcon variant="subtle" size="lg" onClick={() => planService.closePlan()}>
                    ←
                </ActionIcon>
            </Tooltip>

            <Text fw={600} className={styles.title}>
                {appStore.currentPlanName || "Без названия"}
            </Text>

            <Button size="xs" variant="light" onClick={() => planService.saveCurrent()}>
                Сохранить
            </Button>

            <ExportPlanButton />
            <ImportPlanButton />
        </Group>
    );
});

PlanHeader.displayName = "PlanHeader";
