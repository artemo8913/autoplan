import React from "react";
import { observer } from "mobx-react-lite";
import { Group, Text } from "@mantine/core";

import { useStore } from "@/app";
import { formatKmPkM } from "@/shared/lib/measure";

import { getStatusHint } from "../lib/getStatusHint";

import styles from "./StatusBar.module.css";

export const StatusBar: React.FC = observer(() => {
    const { toolStateStore, selectionStore, undoStackStore } = useStore();

    let coordsText = "";
    if (toolStateStore.toolState.tool === "placement" && toolStateStore.toolState.snapInfo) {
        const snap = toolStateStore.toolState.snapInfo;
        const coords = formatKmPkM({ km: snap.km ?? 0, pk: snap.pk ?? 0, m: snap.m ?? 0 });

        const primaryGabarit = snap.nearbyTracks?.[0]?.gabarit;
        if (primaryGabarit !== undefined) {
            coordsText = `${coords}  |  Габарит: ${primaryGabarit} м`;
        } else if (snap.globalY !== undefined) {
            coordsText = `${coords}  |  Y: ${snap.globalY}`;
        } else {
            coordsText = coords;
        }
    }

    const undoText = undoStackStore.canUndo ? `↩ ${undoStackStore.lastDescription}` : "";

    return (
        <Group className={styles.bar} justify="space-between" wrap="nowrap">
            <Text size="xs" c="dimmed" style={{ flex: 1 }}>
                {getStatusHint(toolStateStore.toolState, selectionStore.selectedIds.length)}
            </Text>
            {coordsText && (
                <Text size="xs" ff="monospace" c="gray.7" style={{ flex: 1, textAlign: "center" }}>
                    {coordsText}
                </Text>
            )}
            <Text size="xs" c="dimmed" fs="italic" style={{ flex: 1, textAlign: "right" }}>
                {undoText}
            </Text>
        </Group>
    );
});

StatusBar.displayName = "StatusBar";
