import React, { useState } from "react";
import { Alert, Button, Group, Text } from "@mantine/core";

import { useServices } from "@/app";
import { formatDate } from "@/shared/date/formatDate";

/**
 * Аварийная копия, снятая при падении интерфейса (см. ErrorBoundary).
 * Восстанавливается отдельным планом — исходный не трогаем.
 */
export const CrashDumpBanner: React.FC = () => {
    const { planService } = useServices();
    const [dump, setDump] = useState(() => planService.readCrashDump());

    if (!dump) {
        return null;
    }

    const handleRestore = () => {
        planService.restoreCrashDump();
        setDump(null);
    };

    const handleDiscard = () => {
        planService.discardCrashDump();
        setDump(null);
    };

    return (
        <Alert color="yellow" title="Найдена аварийная копия плана">
            <Text size="sm">
                Приложение аварийно завершило работу {formatDate(dump.savedAt)}. Копия плана «{dump.planName}» была
                сохранена — её можно восстановить отдельным планом.
            </Text>
            <Group mt="sm" gap="xs">
                <Button size="xs" onClick={handleRestore}>
                    Восстановить
                </Button>
                <Button size="xs" variant="subtle" color="gray" onClick={handleDiscard}>
                    Удалить копию
                </Button>
            </Group>
        </Alert>
    );
};

CrashDumpBanner.displayName = "CrashDumpBanner";
