import React from "react";
import { Button, Group, Modal, Stack, TextInput } from "@mantine/core";

import { KmPkMInput } from "@/shared/ui/KmPkMInput";

export interface CreatePlanCoords {
    startKm: number;
    startPk: number;
    startM: number;
    endKm: number;
    endPk: number;
    endM: number;
}

interface CreatePlanModalProps {
    opened: boolean;
    name: string;
    coords: CreatePlanCoords;
    setName: (name: string) => void;
    setCoords: (coords: CreatePlanCoords) => void;
    onClose: () => void;
    onCreate: () => void;
}

export const CreatePlanModal: React.FC<CreatePlanModalProps> = ({
    opened,
    name,
    coords,
    setName,
    setCoords,
    onClose,
    onCreate,
}) => {
    const updateCoord = (field: keyof CreatePlanCoords) => (value: number) => {
        setCoords({ ...coords, [field]: value });
    };

    return (
        <Modal opened={opened} onClose={onClose} title="Новый план" centered onKeyDown={(e) => e.key === "Enter" && onCreate()}>
            <Stack>
                <TextInput
                    label="Название участка"
                    placeholder="например: пер.Малиногорка – Козулька"
                    value={name}
                    onChange={(e) => setName(e.currentTarget.value)}
                    data-autofocus
                />
                <KmPkMInput
                    label="Начало"
                    km={coords.startKm}
                    pk={coords.startPk}
                    m={coords.startM}
                    onKmChange={updateCoord("startKm")}
                    onPkChange={updateCoord("startPk")}
                    onMChange={updateCoord("startM")}
                />
                <KmPkMInput
                    label="Конец"
                    km={coords.endKm}
                    pk={coords.endPk}
                    m={coords.endM}
                    onKmChange={updateCoord("endKm")}
                    onPkChange={updateCoord("endPk")}
                    onMChange={updateCoord("endM")}
                />
                <Group justify="flex-end">
                    <Button variant="subtle" onClick={onClose}>
                        Отмена
                    </Button>
                    <Button onClick={onCreate} disabled={!name.trim()}>
                        Создать
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
};
