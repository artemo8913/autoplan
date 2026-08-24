import React from "react";
import { observer } from "mobx-react-lite";
import { Button, Group, Loader, Text, Tooltip } from "@mantine/core";

import { useServices, useStore } from "@/app";

function formatTime(date: Date): string {
    return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

/** Состояние автосохранения вместо кнопки «Сохранить»: план пишется сам. */
export const SaveIndicator: React.FC = observer(() => {
    const { saveStatusStore } = useStore();
    const { planService } = useServices();

    switch (saveStatusStore.status) {
        case "pending":
            return (
                <Group gap={6} wrap="nowrap">
                    <Loader size={12} />
                    <Text size="xs" c="dimmed">
                        Сохранение…
                    </Text>
                </Group>
            );

        case "saved":
            return (
                <Text size="xs" c="dimmed">
                    {saveStatusStore.lastSavedAt
                        ? `Сохранено в ${formatTime(saveStatusStore.lastSavedAt)}`
                        : "Сохранено"}
                </Text>
            );

        case "error":
            return (
                <Group gap={6} wrap="nowrap">
                    <Tooltip label={saveStatusStore.errorMessage ?? ""} multiline w={260} withArrow>
                        <Text size="xs" c="red" fw={600}>
                            Не сохранено
                        </Text>
                    </Tooltip>
                    <Button size="compact-xs" variant="light" color="red" onClick={() => planService.saveCurrent()}>
                        Повторить
                    </Button>
                </Group>
            );

        case "idle":
            return null;
    }
});

SaveIndicator.displayName = "SaveIndicator";
