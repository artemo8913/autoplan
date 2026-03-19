import React from "react";
import { observer } from "mobx-react-lite";
import { ActionIcon, Divider, Paper, Stack, Text, Tooltip } from "@mantine/core";

import { PanIcon, SelectIcon, PoleIcon, TracksIcon } from "@/shared/ui/toolbar-icons";
import { useStore } from "@/app";

import styles from "./Toolbar.module.css";

// ── ToolButton ────────────────────────────────────────────────────────────────

interface ToolButtonProps {
    label: string;
    icon: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
}

const ToolButton: React.FC<ToolButtonProps> = React.memo(({ label, icon, isActive, onClick }) => (
    <Tooltip label={label} position="right" withArrow>
        <ActionIcon
            variant={isActive ? "filled" : "subtle"}
            color={isActive ? "blue" : "gray"}
            size={36}
            onClick={onClick}
            aria-label={label}
        >
            {icon}
        </ActionIcon>
    </Tooltip>
));

ToolButton.displayName = "ToolButton";

// ── Toolbar ───────────────────────────────────────────────────────────────────

export const Toolbar: React.FC = observer(() => {
    const { toolStateStore } = useStore();
    const ts = toolStateStore.toolState;

    const isPan = ts.tool === "panTool";
    const isSelect = ts.tool === "idle" || ts.tool === "selection";
    const isInfrastructureOpen = toolStateStore.isInfrastructurePanelOpen;

    const cfg = ts.tool === "placement" ? ts.entityConfig : null;

    const isKsConcrete = cfg?.kind === "catenaryPole" && (cfg.material ?? "concrete") === "concrete";
    const isKsMetal = cfg?.kind === "catenaryPole" && cfg.material === "metal";
    const isVlIntermediate = cfg?.kind === "vlPole" && cfg.vlType === "intermediate";
    const isVlAngular = cfg?.kind === "vlPole" && cfg.vlType === "angular";
    const isVlTerminal = cfg?.kind === "vlPole" && cfg.vlType === "terminal";

    return (
        <Paper shadow="sm" p={6} className={styles.toolbar}>
            {/* ── Навигация ── */}
            <Stack gap={2}>
                <Text size="xs" c="dimmed" className={styles["group__label"]}>
                    Навигация
                </Text>
                <ToolButton
                    label="Перемещение холста (ESC)"
                    icon={<PanIcon />}
                    isActive={isPan}
                    onClick={() => toolStateStore.resetToPan()}
                />
                <ToolButton
                    label="Выделение"
                    icon={<SelectIcon />}
                    isActive={isSelect}
                    onClick={() => toolStateStore.resetToIdle()}
                />
            </Stack>

            <Divider my={6} />

            {/* ── Инфраструктура ── */}
            <Stack gap={2}>
                <Text size="xs" c="dimmed" className={styles["group__label"]}>
                    Инфраструктура
                </Text>
                <ToolButton
                    label="Пути"
                    icon={<TracksIcon />}
                    isActive={isInfrastructureOpen}
                    onClick={() => toolStateStore.toggleInfrastructurePanel()}
                />
            </Stack>

            <Divider my={6} />

            {/* ── Опоры ── */}
            <Stack gap={2}>
                <Text size="xs" c="dimmed" className={styles["group__label"]}>
                    Опоры
                </Text>
                <ToolButton
                    label="Опора КС, бетонная (P)"
                    icon={<PoleIcon shape="circle" label="КС" />}
                    isActive={isKsConcrete}
                    onClick={() => toolStateStore.startPlacement({ kind: "catenaryPole", material: "concrete" })}
                />
                <ToolButton
                    label="Опора КС, металлическая"
                    icon={<PoleIcon shape="square" label="КС" />}
                    isActive={isKsMetal}
                    onClick={() => toolStateStore.startPlacement({ kind: "catenaryPole", material: "metal" })}
                />
                <ToolButton
                    label="Опора ВЛ (промежуточная)"
                    icon={<PoleIcon shape="circle" label="ВЛ" />}
                    isActive={isVlIntermediate}
                    onClick={() => toolStateStore.startPlacement({ kind: "vlPole", vlType: "intermediate" })}
                />
                <ToolButton
                    label="Опора ВЛ (угловая)"
                    icon={<PoleIcon shape="triangle" label="ВЛ" />}
                    isActive={isVlAngular}
                    onClick={() => toolStateStore.startPlacement({ kind: "vlPole", vlType: "angular" })}
                />
                <ToolButton
                    label="Опора ВЛ (концевая)"
                    icon={<PoleIcon shape="square" label="ВЛ" />}
                    isActive={isVlTerminal}
                    onClick={() => toolStateStore.startPlacement({ kind: "vlPole", vlType: "terminal" })}
                />
            </Stack>
        </Paper>
    );
});

Toolbar.displayName = "Toolbar";
