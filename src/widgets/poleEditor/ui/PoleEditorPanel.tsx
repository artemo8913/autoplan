import { useCallback } from "react";
import { observer } from "mobx-react-lite";
import { Text } from "@mantine/core";

import type { CatenaryPole } from "@/entities/catenaryPlanGraphic";
import { SidePanel } from "@/shared/ui/SidePanel";
import { useStore } from "@/app";

import { SinglePoleEditor } from "./SinglePoleEditor";
import { BulkPoleEditor } from "./BulkPoleEditor";

export const PoleEditorPanel = observer(() => {
    const { toolStateStore, selectionStore, catenaryPoleStore, uiPanelsStore } = useStore();

    const selectedPoles = selectionStore.selectedIds
        .map((id) => catenaryPoleStore.poles.get(id))
        .filter((p): p is CatenaryPole => p !== undefined);
    const isBulkMode = selectedPoles.length > 1;

    const pole = !isBulkMode && selectionStore.firstSelectedId
        ? catenaryPoleStore.poles.get(selectionStore.firstSelectedId)
        : null;

    const handleClose = useCallback(() => {
        uiPanelsStore.togglePoleEditorPanel();
        toolStateStore.resetToIdle();
    }, [toolStateStore, uiPanelsStore]);

    if (!uiPanelsStore.isOpenPoleEditorPanel) {
        return null;
    }

    if (isBulkMode) {
        return <BulkPoleEditor poles={selectedPoles} onClose={handleClose} />;
    }

    if (!pole) {
        return (
            <SidePanel title="Опора КС" onClose={handleClose} width={280}>
                <Text size="xs" c="dimmed">
                    Выберите опору КС на плане
                </Text>
            </SidePanel>
        );
    }

    return <SinglePoleEditor pole={pole} onClose={handleClose} />;
});

PoleEditorPanel.displayName = "PoleEditorPanel";
