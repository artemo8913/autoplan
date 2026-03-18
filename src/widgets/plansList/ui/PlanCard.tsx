import React from "react";
import { Button, Card, Group, Stack, Text } from "@mantine/core";

import { formatDate } from "@/shared/date/formatDate";
import type { PlanMeta } from "@/shared/types/planTypes";

interface PlanCardProps {
    plan: PlanMeta;
    onOpen: (id: string) => void;
    onDelete: (id: string) => void;
}

export const PlanCard: React.FC<PlanCardProps> = ({ plan, onOpen, onDelete }) => {
    return (
        <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Stack gap="xs">
                <Text fw={600} lineClamp={2}>
                    {plan.name}
                </Text>
                <Text size="xs" c="dimmed">
                    Создан: {formatDate(plan.createdAt)}
                </Text>
                <Text size="xs" c="dimmed">
                    Изменён: {formatDate(plan.updatedAt)}
                </Text>
                <Group mt="xs" gap="xs">
                    <Button size="xs" variant="filled" onClick={() => onOpen(plan.id)}>
                        Открыть
                    </Button>
                    <Button size="xs" variant="subtle" color="red" onClick={() => onDelete(plan.id)}>
                        Удалить
                    </Button>
                </Group>
            </Stack>
        </Card>
    );
};
