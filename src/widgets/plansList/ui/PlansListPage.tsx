import React from "react";
import { observer } from "mobx-react-lite";
import { Button, Group, SimpleGrid, Stack, Text, Title } from "@mantine/core";

import { useStore, useServices } from "@/app";
import { CreatePlanButton } from "@/features/plans/create";

import { PlanCard } from "./PlanCard";
import { CrashDumpBanner } from "./CrashDumpBanner";

import styles from "./PlansListPage.module.css";

export const PlansListPage: React.FC = observer(() => {
    const { plansStore, confirmDialogStore } = useStore();
    const { planService } = useServices();

    // Удаление плана необратимо (undo не спасёт) — спрашиваем всегда.
    const handleDelete = async (id: string) => {
        const plan = plansStore.get(id);

        const confirmed = await confirmDialogStore.ask({
            title: "Удалить план?",
            message: `План «${plan?.name ?? ""}» будет удалён из браузера безвозвратно.`,
            details: ["Отменить это действие нельзя", "Экспортируйте план в файл, если он может пригодиться"],
            confirmLabel: "Удалить",
            danger: true,
        });

        if (confirmed) {
            planService.deletePlan(id);
        }
    };

    return (
        <Stack p="xl" className={styles.page}>
            <Group justify="space-between">
                <Title order={2}>Планы контактной сети</Title>
                <Group>
                    <Button variant="light" onClick={() => planService.loadDemoPlan()}>
                        Загрузить демо-план
                    </Button>
                    <CreatePlanButton />
                </Group>
            </Group>

            <CrashDumpBanner />

            {plansStore.list.length === 0 ? (
                <Text c="dimmed">Нет планов. Создайте первый план.</Text>
            ) : (
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
                    {plansStore.list.map((plan) => (
                        <PlanCard
                            key={plan.id}
                            plan={plan}
                            onOpen={(id) => planService.openPlan(id)}
                            onDelete={handleDelete}
                        />
                    ))}
                </SimpleGrid>
            )}
        </Stack>
    );
});

PlansListPage.displayName = "PlansListPage";
