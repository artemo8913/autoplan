import { useCallback } from "react";
import { observer } from "mobx-react-lite";
import { Text } from "@mantine/core";

import type { CrossSpan } from "@/entities/catenaryPlanGraphic";
import { SidePanel } from "@/shared/ui/SidePanel";
import { useStore } from "@/app";

import { SingleCrossSpanEditor } from "./SingleCrossSpanEditor";
import { BulkCrossSpanEditor } from "./BulkCrossSpanEditor";

/** Панель характеристик поперечин: одна выделенная — свойства, несколько — массовая правка. */
export const CrossSpanEditorPanel = observer(() => {
    const { toolStateStore, selectionStore, crossSpansStore, uiPanelsStore } = useStore();

    const selected = selectionStore.selectedIds
        .map((id) => crossSpansStore.crossSpans.get(id))
        .filter((cs): cs is CrossSpan => cs !== undefined);

    const handleClose = useCallback(() => {
        uiPanelsStore.closeCrossSpanEditorPanel();
        toolStateStore.resetToIdle();
    }, [toolStateStore, uiPanelsStore]);

    if (!uiPanelsStore.isOpenCrossSpanEditorPanel) {
        return null;
    }

    if (selected.length > 1) {
        return <BulkCrossSpanEditor crossSpans={selected} onClose={handleClose} />;
    }

    if (selected.length === 0) {
        return (
            <SidePanel title="Поперечина" onClose={handleClose} width={280}>
                <Text size="xs" c="dimmed">
                    Выберите поперечину на плане
                </Text>
            </SidePanel>
        );
    }

    return <SingleCrossSpanEditor crossSpan={selected[0]} onClose={handleClose} />;
});

CrossSpanEditorPanel.displayName = "CrossSpanEditorPanel";
