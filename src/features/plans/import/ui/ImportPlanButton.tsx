import React, { useRef } from "react";
import { Button } from "@mantine/core";

import type { PlanDTO } from "@/shared/types/planTypes";
import { useServices } from "@/app";

export const ImportPlanButton: React.FC = () => {
    const { planService } = useServices();
    const inputRef = useRef<HTMLInputElement>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];

        if (!file) {
            return;
        }

        const reader = new FileReader();

        reader.onload = (ev) => {
            try {
                const dto = JSON.parse(ev.target?.result as string) as PlanDTO;
                planService.importPlan(dto);
            } catch {
                console.error("Ошибка импорта плана");
            }
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
