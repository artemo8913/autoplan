import React from "react";
import { Button, Group, Modal, Stack, TextInput } from "@mantine/core";

interface CreatePlanModalProps {
    opened: boolean;
    name: string;
    setName: (name: string) => void;
    onClose: () => void;
    onCreate: () => void;
}

export const CreatePlanModal: React.FC<CreatePlanModalProps> = ({ opened, name, setName, onClose, onCreate }) => {
    return (
        <Modal opened={opened} onClose={onClose} title="Новый план" centered>
            <Stack>
                <TextInput
                    label="Название участка"
                    placeholder="например: пер.Малиногорка – Козулька"
                    value={name}
                    onChange={(e) => setName(e.currentTarget.value)}
                    onKeyDown={(e) => e.key === "Enter" && onCreate()}
                    data-autofocus
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
