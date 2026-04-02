import React, { useState } from "react";
import { observer } from "mobx-react-lite";
import { ActionIcon, Divider, Paper, Stack, Text, Tooltip } from "@mantine/core";
import { PanIcon, SelectIcon, PoleIcon, CrossSpanIcon, DisconnectorIcon, TracksIcon, LinesIcon, JunctionsIcon, SettingsIcon } from "@/shared/ui/toolbar-icons";
import { useStore } from "@/app";
import { DisplaySettingsModal } from "@/widgets/displaySettings";

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
    const { toolStateStore, uiPanelsStore } = useStore();
    const [settingsOpened, setSettingsOpened] = useState(false);
    const ts = toolStateStore.toolState;

    const isPan = ts.tool === "panTool" || ts.tool === "dragPan";
    const isSelect = ts.tool === "idle";

    const cfg = ts.tool === "placement" ? ts.entityConfig : null;

    const isKsConcrete = cfg?.kind === "catenaryPole" && (cfg.material ?? "concrete") === "concrete";
    const isKsMetal = cfg?.kind === "catenaryPole" && cfg.material === "metal";
    const isVlIntermediate = cfg?.kind === "vlPole" && cfg.vlType === "intermediate";
    const isVlAngular = cfg?.kind === "vlPole" && cfg.vlType === "angular";
    const isVlTerminal = cfg?.kind === "vlPole" && cfg.vlType === "terminal";

    const isCrossSpanFlexible = ts.tool === "crossSpan" && ts.spanType === "flexible";
    const isCrossSpanRigid = ts.tool === "crossSpan" && ts.spanType === "rigid";

    const isDisconnector = cfg?.kind === "disconnector";

    return (
        <Paper shadow="sm" p={6} className={styles.toolbar}>
            {/* ── Навигация ── */}
            <Stack gap={2}>
                <Text size="xs" c="dimmed" className={styles["group__label"]}>
                    Навигация
                </Text>
                <ToolButton
                    label="Перемещение холста"
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
                    isActive={uiPanelsStore.isOpenTracksEditorPanel}
                    onClick={() => uiPanelsStore.toggleTracksEditorPanel()}
                />
                <ToolButton
                    label="Опоры"
                    icon={<TracksIcon />}
                    isActive={uiPanelsStore.isOpenPoleEditorPanel}
                    onClick={() => uiPanelsStore.togglePoleEditorPanel()}
                />
                <ToolButton
                    label="Линии"
                    icon={<LinesIcon />}
                    isActive={uiPanelsStore.isOpenLinesEditorPanel}
                    onClick={() => uiPanelsStore.toggleLinesEditorPanel()}
                />
                <ToolButton
                    label="Сопряжения"
                    icon={<JunctionsIcon />}
                    isActive={uiPanelsStore.isOpenJunctionsEditorPanel}
                    onClick={() => uiPanelsStore.toggleJunctionsEditorPanel()}
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

            <Divider my={6} />

            {/* ── Поперечины ── */}
            <Stack gap={2}>
                <Text size="xs" c="dimmed" className={styles["group__label"]}>
                    Поперечины
                </Text>
                <ToolButton
                    label="Гибкая поперечина"
                    icon={<CrossSpanIcon dashed />}
                    isActive={isCrossSpanFlexible}
                    onClick={() => toolStateStore.startCrossSpan("flexible")}
                />
                <ToolButton
                    label="Жёсткая поперечина"
                    icon={<CrossSpanIcon />}
                    isActive={isCrossSpanRigid}
                    onClick={() => toolStateStore.startCrossSpan("rigid")}
                />
            </Stack>

            <Divider my={6} />

            {/* ── Оборудование ── */}
            <Stack gap={2}>
                <Text size="xs" c="dimmed" className={styles["group__label"]}>
                    Оборудование
                </Text>
                <ToolButton
                    label="Разъединитель"
                    icon={<DisconnectorIcon />}
                    isActive={isDisconnector}
                    onClick={() => toolStateStore.startPlacement({ kind: "disconnector", controlType: "manual", phaseCount: 1 })}
                />
            </Stack>

            <Divider my={6} />

            {/* ── Настройки ── */}
            <Tooltip label="Настройки отображения" position="right" withArrow>
                <ActionIcon
                    variant="subtle"
                    color="gray"
                    size={36}
                    onClick={() => setSettingsOpened(true)}
                    aria-label="Настройки отображения"
                >
                    <SettingsIcon />
                </ActionIcon>
            </Tooltip>

            <DisplaySettingsModal opened={settingsOpened} onClose={() => setSettingsOpened(false)} />
        </Paper>
    );
});

Toolbar.displayName = "Toolbar";
