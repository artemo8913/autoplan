import React, { useState } from "react";
import { ActionIcon, Select } from "@mantine/core";

import styles from "./LinesEditorPanel.module.css";

type SelectData = Array<{ value: string; label: string }>;

interface AddFpRowProps {
    poleSelectData: SelectData;
    trackSelectData?: SelectData;
    defaultTrackId?: string;
    onAdd: (poleId: string, trackId?: string) => void;
}

export const AddFpRow: React.FC<AddFpRowProps> = ({ poleSelectData, trackSelectData, defaultTrackId, onAdd }) => {
    const [poleId, setPoleId] = useState<string | null>(null);
    const [trackId, setTrackId] = useState<string | null>(defaultTrackId ?? null);

    const handleAdd = () => {
        if (poleId) {
            onAdd(poleId, trackId && trackId !== "__none__" ? trackId : undefined);
            setPoleId(null);
            setTrackId(defaultTrackId ?? null);
        }
    };

    return (
        <div className={styles.addFpRow}>
            <Select
                size="xs"
                data={poleSelectData}
                value={poleId}
                onChange={setPoleId}
                searchable
                placeholder="опора"
                className={styles.addFpRow__select}
            />
            {trackSelectData && (
                <Select
                    size="xs"
                    data={trackSelectData}
                    value={trackId ?? "__none__"}
                    onChange={setTrackId}
                    placeholder="путь"
                    className={styles.addFpRow__select}
                />
            )}
            <ActionIcon variant="subtle" color="blue" size="xs" onClick={handleAdd} disabled={!poleId}>
                +
            </ActionIcon>
        </div>
    );
};
