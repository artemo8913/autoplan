import React, { useRef } from "react";
import { observer } from "mobx-react-lite";
import { Button, Group, List, Modal, Stack, Text } from "@mantine/core";

import { useStore } from "@/app";

/**
 * Одно окно подтверждения на всё приложение (см. ConfirmDialogStore).
 * Рисуется на верхнем уровне App — работает и на канве, и в списке планов.
 */
export const ConfirmDialog: React.FC = observer(() => {
    const { confirmDialogStore } = useStore();
    const request = confirmDialogStore.request;

    // Пока окно закрывается (анимация Mantine), показываем последний запрос — иначе текст мигает.
    const lastRequest = useRef(request);
    if (request) {
        lastRequest.current = request;
    }
    const shown = request ?? lastRequest.current;

    return (
        <Modal
            opened={request !== null}
            onClose={() => confirmDialogStore.cancel()}
            title={shown?.title ?? ""}
            size="sm"
            centered
        >
            <Stack gap="sm">
                <Text size="sm">{shown?.message}</Text>

                {shown?.details && shown.details.length > 0 && (
                    <List size="sm" spacing={2} withPadding>
                        {shown.details.map((line) => (
                            <List.Item key={line}>{line}</List.Item>
                        ))}
                    </List>
                )}

                <Group justify="flex-end">
                    <Button variant="default" size="xs" onClick={() => confirmDialogStore.cancel()}>
                        {shown?.cancelLabel ?? "Отмена"}
                    </Button>
                    <Button
                        color={shown?.danger ? "red" : "blue"}
                        size="xs"
                        onClick={() => confirmDialogStore.confirm()}
                    >
                        {shown?.confirmLabel ?? "Продолжить"}
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
});

ConfirmDialog.displayName = "ConfirmDialog";
