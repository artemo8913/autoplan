import React from "react";
import { observer } from "mobx-react-lite";

import { useStore, useServices } from "@/app";

import { getStatusHint } from "../lib/getStatusHint";

export const StatusBar: React.FC = observer(() => {
    const { uiStore, undoStackStore } = useStore();
    const { measureService } = useServices();

    let coordsText = "";
    if (uiStore.toolState.tool === "placement" && uiStore.toolState.snapInfo) {
        const snap = uiStore.toolState.snapInfo;
        const coords = measureService.formatKmPkM({ km: snap.km ?? 0, pk: snap.pk ?? 0, m: snap.m ?? 0 });

        if (snap.gauge !== undefined) {
            coordsText = `${coords}  |  Габарит: ${snap.gauge} м`;
        } else if (snap.globalY !== undefined) {
            coordsText = `${coords}  |  Y: ${snap.globalY}`;
        } else {
            coordsText = coords;
        }
    }

    const undoText = undoStackStore.canUndo ? `↩ ${undoStackStore.lastDescription}` : "";

    return (
        <div className="status-bar">
            <div className="status-bar__hint">{getStatusHint(uiStore.toolState)}</div>
            {coordsText && <div className="status-bar__coords">{coordsText}</div>}
            <div className="status-bar__undo">{undoText}</div>
        </div>
    );
});

StatusBar.displayName = "StatusBar";
