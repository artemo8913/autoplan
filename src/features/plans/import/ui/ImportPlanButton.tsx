import React, { useRef } from "react";
import { Button } from "@mantine/core";

import { useServices } from "@/app";

export const ImportPlanButton: React.FC = () => {
    const { planService, notificationService } = useServices();
    const inputRef = useRef<HTMLInputElement>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];

        if (!file) {
            return;
        }

        const reader = new FileReader();

        reader.onload = (ev) => {
            let parsed: unknown;
            try {
                parsed = JSON.parse(ev.target?.result as string);
            } catch {
                notificationService.error("Импорт не выполнен: файл не является корректным JSON", {
                    key: "plan-import",
                });
                return;
            }

            // Об успехе и о причине отказа сообщает сам PlanService.
            planService.importPlan(parsed);
        };

        reader.readAsText(file);

        e.target.value = "";
    };

    return (
        <>
            <Button size="xs" variant="subtle" onClick={() => inputRef.current?.click()}>
                ↑ Импорт
            </Button>
            <input
                ref={inputRef}
                type="file"
                accept=".json"
                aria-label="Импорт плана из JSON-файла"
                style={{ display: "none" }}
                onChange={handleChange}
            />
        </>
    );
};
