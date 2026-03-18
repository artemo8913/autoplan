import React from "react";
import { Button } from "@mantine/core";

import { useStore, useServices } from "@/app";

export const ExportPlanButton: React.FC = () => {
    const { appStore } = useStore();
    const { planService } = useServices();

    const handleExport = () => {
        planService.saveCurrent();
        const raw = localStorage.getItem("ech3_plan_" + appStore.currentPlanId);

        if (!raw) {
            return;
        }

        const blob = new Blob([raw], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${appStore.currentPlanName || "plan"}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <Button size="xs" variant="subtle" onClick={handleExport}>
            ↓ Экспорт
        </Button>
    );
};
