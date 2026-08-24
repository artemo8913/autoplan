import { notifications } from "@mantine/notifications";

import { BaseNotificationService, type NotificationInput, type NotificationLevel } from "./NotificationService";

const COLORS: Record<NotificationLevel, string> = {
    info: "blue",
    success: "teal",
    warning: "yellow",
    error: "red",
};

const AUTO_CLOSE_MS: Record<NotificationLevel, number | false> = {
    info: 4000,
    success: 3000,
    warning: 5000,
    error: false, // ошибку пользователь закрывает сам — иначе её легко пропустить
};

/** Реализация обратной связи поверх @mantine/notifications (см. <Notifications /> в main.tsx). */
export class MantineNotificationService extends BaseNotificationService {
    show({ level, message, title, key }: NotificationInput): void {
        const id = key ? `notification-${key}` : undefined;

        if (id) {
            notifications.hide(id);
        }

        notifications.show({
            id,
            title,
            message,
            color: COLORS[level],
            autoClose: AUTO_CLOSE_MS[level],
            withCloseButton: true,
        });
    }
}
