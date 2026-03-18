import React from "react";
import { observer } from "mobx-react-lite";
import { Group, SimpleGrid, Stack, Text, Title } from "@mantine/core";

import { useStore, useServices } from "@/app";
import { CreatePlanButton } from "@/features/plans/create";

import { PlanCard } from "./PlanCard";

import styles from "./PlansListPage.module.css";

export const PlansListPage: React.FC = observer(() => {
    const { plansStore } = useStore();
    const { planService } = useServices();

    return (
        <Stack p="xl" className={styles.page}>
            <Group justify="space-between">
                <Title order={2}>Планы контактной сети</Title>
                <CreatePlanButton />
            </Group>

            {plansStore.list.length === 0 ? (
                <Text c="dimmed">Нет планов. Создайте первый план.</Text>
            ) : (
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
                    {plansStore.list.map((plan) => (
                        <PlanCard
                            key={plan.id}
                            plan={plan}
                            onOpen={(id) => planService.openPlan(id)}
                            onDelete={(id) => planService.deletePlan(id)}
                        />
                    ))}
                </SimpleGrid>
            )}
        </Stack>
    );
});

PlansListPage.displayName = "PlansListPage";
