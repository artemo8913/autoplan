import React from "react";
import { Button } from "@mantine/core";

import { useServices } from "@/app";

export const ExportPlanButton: React.FC = () => {
    const { planService } = useServices();

    const handleExport = () => {
        const exported = planService.exportCurrentPlanJson();

        if (!exported) {
            return;
        }

        const blob = new Blob([exported.json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${exported.name || "plan"}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <Button size="xs" variant="subtle" onClick={handleExport}>
            ↓ Экспорт
        </Button>
    );
};
