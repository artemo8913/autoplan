import { ActionIcon, Group, SegmentedControl, Stack, Text, TextInput } from "@mantine/core";

import type { JunctionType } from "@/shared/types/catenaryTypes";
import type { Junction } from "@/entities/catenaryPlanGraphic";

import { JUNCTION_TYPE_DATA } from "../lib/selectOptions";
import { junctionDisplayName } from "../lib/junctionDisplayName";

import styles from "./JunctionsEditorPanel.module.css";
import { observer } from "mobx-react-lite";

interface JunctionTableRowProps {
    junction: Junction;
    onDelete: (j: Junction) => void;
}

export const JunctionTableRow: React.FC<JunctionTableRowProps> = observer(({ junction, onDelete }) => {
    return (
        <div className={styles.junctionRow}>
            <Group justify="space-between" align="flex-start" gap="xs" wrap="nowrap">
                <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                    <TextInput
                        size="xs"
                        placeholder={junctionDisplayName(junction)}
                        value={junction.name}
                        onChange={(e) => junction.setName(e.target.value)}
                    />
                    <SegmentedControl
                        size="xs"
                        data={JUNCTION_TYPE_DATA}
                        value={junction.type}
                        onChange={(v) => junction.setType(v as JunctionType)}
                    />
                    <Text size="xs" c="dimmed">
                        {junction.section1.name || "АУ-?"} ↔ {junction.section2.name || "АУ-?"}
                    </Text>
                </Stack>
                <ActionIcon
                    variant="subtle"
                    color="red"
                    size="sm"
                    title="Удалить сопряжение"
                    onClick={() => onDelete(junction)}
                >
                    ✕
                </ActionIcon>
            </Group>
        </div>
    );
});

JunctionTableRow.displayName = "JunctionTableRow";
