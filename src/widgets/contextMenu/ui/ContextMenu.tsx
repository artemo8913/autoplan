import React, { useCallback } from "react";
import { observer } from "mobx-react-lite";
import { Menu, Text } from "@mantine/core";

import { useServices, useStore } from "@/app";

import { buildContextMenuItems, type ContextMenuActionId } from "../lib/buildContextMenuItems";

/**
 * Контекстное меню канвы (ПКМ). Пункты выводятся из выделения — см. `buildContextMenuItems`;
 * здесь только позиционирование и диспетчеризация действий по сервисам.
 */
const ContextMenuBase: React.FC = () => {
    const { contextMenuStore, selectionStore, undoStackStore, uiPanelsStore, cameraStore, tracksStore } = useStore();
    const { entityService, selectionActionsService } = useServices();

    const dispatch = useCallback(
        (action: ContextMenuActionId) => {
            const ids = selectionStore.selectedIds;

            switch (action) {
                case "openPoleEditor":
                    uiPanelsStore.openPoleEditorPanel();
                    break;
                case "openCrossSpanEditor":
                    uiPanelsStore.openCrossSpanEditorPanel();
                    break;
                case "createFlexibleCrossSpan":
                    entityService.createCrossSpan("flexible", ids[0], ids[1]);
                    break;
                case "createRigidCrossSpan":
                    entityService.createCrossSpan("rigid", ids[0], ids[1]);
                    break;
                case "openLinesEditor":
                    uiPanelsStore.openLinesEditorPanel();
                    break;
                case "openTracksEditor":
                    uiPanelsStore.openTracksEditorPanel();
                    break;
                case "openJunctionsEditor":
                    uiPanelsStore.openJunctionsEditorPanel();
                    break;
                case "clearSelection":
                    selectionStore.clear();
                    break;
                case "deleteSelection":
                    void selectionActionsService.deleteSelection();
                    break;
                case "fitToPlan": {
                    const { startX, endX } = tracksStore.railway;
                    cameraStore.fitToRailway(startX, endX);
                    break;
                }
                case "undo":
                    undoStackStore.undo();
                    break;
                case "redo":
                    undoStackStore.redo();
                    break;
            }

            contextMenuStore.close();
        },
        [
            cameraStore,
            contextMenuStore,
            entityService,
            selectionActionsService,
            selectionStore,
            tracksStore,
            uiPanelsStore,
            undoStackStore,
        ],
    );

    const { screenPos } = contextMenuStore;
    if (!screenPos) {
        return null;
    }

    const items = buildContextMenuItems({
        selectedType: selectionStore.selectedType,
        selectedCount: selectionStore.selectedIds.length,
        canUndo: undoStackStore.canUndo,
        canRedo: undoStackStore.canRedo,
    });

    return (
        <Menu
            opened
            position="bottom-start"
            floatingStrategy="fixed"
            shadow="md"
            width={260}
            onClose={() => contextMenuStore.close()}
        >
            {/* Якорь нулевого размера в точке курсора: меню само отодвинется от краёв окна. */}
            <Menu.Target>
                <div style={{ position: "fixed", left: screenPos.x, top: screenPos.y, width: 0, height: 0 }} />
            </Menu.Target>

            <Menu.Dropdown>
                {items.map((item, index) => {
                    if (item.kind === "divider") {
                        return <Menu.Divider key={`divider-${index}`} />;
                    }
                    if (item.kind === "label") {
                        return <Menu.Label key={`label-${index}`}>{item.text}</Menu.Label>;
                    }
                    return (
                        <Menu.Item
                            key={item.action}
                            color={item.danger ? "red" : undefined}
                            disabled={item.disabled}
                            rightSection={
                                item.shortcut && (
                                    <Text size="xs" c="dimmed">
                                        {item.shortcut}
                                    </Text>
                                )
                            }
                            onClick={() => dispatch(item.action)}
                        >
                            {item.label}
                        </Menu.Item>
                    );
                })}
            </Menu.Dropdown>
        </Menu>
    );
};

export const ContextMenu = observer(ContextMenuBase);
