import { useState } from "react";
import { Button, Group, SegmentedControl, Select, Text } from "@mantine/core";

import type { JunctionType } from "@/shared/types/catenaryTypes";
import type { AnchorSection } from "@/entities/catenaryPlanGraphic";

import { JUNCTION_TYPE_DATA } from "../lib/selectOptions";

import styles from "./JunctionsEditorPanel.module.css";

interface CreateJunctionFormProps {
    sections: AnchorSection[];
    onCreate: (section1Id: string, section2Id: string, type: JunctionType) => void;
    onCancel: () => void;
}

export const CreateJunctionForm: React.FC<CreateJunctionFormProps> = ({ sections, onCreate, onCancel }) => {
    const [section1Id, setSection1Id] = useState<string | null>(null);
    const [section2Id, setSection2Id] = useState<string | null>(null);
    const [type, setType] = useState<JunctionType>("non-insulating");

    const sectionData = sections.map((s) => ({
        value: s.id,
        label: s.name || `АУ (${s.startPole?.name ?? "?"}–${s.endPole?.name ?? "?"})`,
    }));

    const canCreate = section1Id && section2Id && section1Id !== section2Id;

    return (
        <div className={styles.createForm}>
            <Text size="xs" fw={500}>
                Новое сопряжение
            </Text>
            <Select
                size="xs"
                label="Секция 1"
                placeholder="Выберите АУ"
                data={sectionData}
                value={section1Id}
                onChange={setSection1Id}
                searchable
            />
            <Select
                size="xs"
                label="Секция 2"
                placeholder="Выберите АУ"
                data={sectionData}
                value={section2Id}
                onChange={setSection2Id}
                searchable
            />
            <SegmentedControl
                size="xs"
                data={JUNCTION_TYPE_DATA}
                value={type}
                onChange={(v) => setType(v as JunctionType)}
            />
            <Group gap="xs">
                <Button size="xs" disabled={!canCreate} onClick={() => onCreate(section1Id!, section2Id!, type)}>
                    Добавить
                </Button>
                <Button size="xs" variant="subtle" color="gray" onClick={onCancel}>
                    Отмена
                </Button>
            </Group>
        </div>
    );
};
