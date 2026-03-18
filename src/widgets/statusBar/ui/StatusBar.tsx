import React from "react";
import { observer } from "mobx-react-lite";
import { Group, Text } from "@mantine/core";

import { useStore, useServices } from "@/app";

import { getStatusHint } from "../lib/getStatusHint";

import styles from "./StatusBar.module.css";

export const StatusBar: React.FC = observer(() => {
    const { uiStore, undoStackStore } = useStore();
    const { measureService } = useServices();

    let coordsText = "";
    if (uiStore.toolState.tool === "placement" && uiStore.toolState.snapInfo) {
        const snap = uiStore.toolState.snapInfo;
        const coords = measureService.formatKmPkM({ km: snap.km ?? 0, pk: snap.pk ?? 0, m: snap.m ?? 0 });

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
                {getStatusHint(uiStore.toolState)}
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
