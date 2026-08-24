/**
 * Обратная связь пользователю: тост вместо «ничего не происходит».
 *
 * Сервисы зависят только от этого интерфейса — конкретный вывод (Mantine)
 * подключается в composition root, а тесты подставляют заглушку.
 */
export type NotificationLevel = "info" | "success" | "warning" | "error";

export interface NotificationInput {
    level: NotificationLevel;
    message: string;
    title?: string;
    /**
     * Ключ дедупликации: тост с тем же ключом заменяет предыдущий,
     * а не копится стопкой (повторный клик мимо опоры и т. п.).
     */
    key?: string;
}

export interface NotificationService {
    show(notification: NotificationInput): void;
    info(message: string, options?: { title?: string; key?: string }): void;
    success(message: string, options?: { title?: string; key?: string }): void;
    warning(message: string, options?: { title?: string; key?: string }): void;
    error(message: string, options?: { title?: string; key?: string }): void;
}

/** База с методами-ярлыками: наследникам достаточно реализовать `show`. */
export abstract class BaseNotificationService implements NotificationService {
    abstract show(notification: NotificationInput): void;

    info(message: string, options?: { title?: string; key?: string }): void {
        this.show({ level: "info", message, ...options });
    }

    success(message: string, options?: { title?: string; key?: string }): void {
        this.show({ level: "success", message, ...options });
    }

    warning(message: string, options?: { title?: string; key?: string }): void {
        this.show({ level: "warning", message, ...options });
    }

    error(message: string, options?: { title?: string; key?: string }): void {
        this.show({ level: "error", message, ...options });
    }
}

/** Заглушка: ничего не показывает, но помнит последние уведомления — удобна в тестах. */
export class MemoryNotificationService extends BaseNotificationService {
    readonly notifications: NotificationInput[] = [];

    show(notification: NotificationInput): void {
        this.notifications.push(notification);
    }

    get last(): NotificationInput | undefined {
        return this.notifications[this.notifications.length - 1];
    }

    clear(): void {
        this.notifications.length = 0;
    }
}
