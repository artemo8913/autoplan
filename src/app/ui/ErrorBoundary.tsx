import { Component, type ErrorInfo, type ReactNode } from "react";
import { Alert, Button, Code, Group, Stack, Text, Title } from "@mantine/core";

import { useServices } from "../lib/servicesContext";

interface ErrorBoundaryProps {
    children: ReactNode;
    /** Снять аварийный дамп плана. Возвращает `true`, если копия записана. */
    onError: (error: Error, info: ErrorInfo) => boolean;
}

interface ErrorBoundaryState {
    error: Error | null;
    dumpSaved: boolean;
}

/**
 * Падение любого компонента не должно стоить пользователю работы:
 * перед показом заглушки план уходит в аварийную копию (localStorage).
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = { error: null, dumpSaved: false };

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return { error };
    }

    componentDidCatch(error: Error, info: ErrorInfo): void {
        console.error("Необработанная ошибка интерфейса", error, info);
        const dumpSaved = this.props.onError(error, info);
        this.setState({ dumpSaved });
    }

    private _reload = (): void => {
        window.location.reload();
    };

    render(): ReactNode {
        const { error, dumpSaved } = this.state;

        if (!error) {
            return this.props.children;
        }

        return (
            <Stack p="xl" gap="md" maw={720}>
                <Title order={3}>Что-то пошло не так</Title>

                <Alert color={dumpSaved ? "yellow" : "red"} title={dumpSaved ? "План сохранён" : "Копия не создана"}>
                    {dumpSaved
                        ? "Аварийная копия плана записана. После перезагрузки её можно восстановить в списке планов."
                        : "Аварийную копию записать не удалось — возможно, план не был открыт."}
                </Alert>

                <Text size="sm" c="dimmed">
                    Сообщите разработчику текст ошибки:
                </Text>
                <Code block>{`${error.name}: ${error.message}`}</Code>

                <Group>
                    <Button onClick={this._reload}>Перезагрузить приложение</Button>
                </Group>
            </Stack>
        );
    }
}

/** Обёртка с доступом к сервисам: сам ErrorBoundary обязан быть классом. */
export function AppErrorBoundary({ children }: { children: ReactNode }) {
    const { planService } = useServices();

    return (
        <ErrorBoundary onError={(error) => planService.saveCrashDump(`${error.name}: ${error.message}`)}>
            {children}
        </ErrorBoundary>
    );
}
