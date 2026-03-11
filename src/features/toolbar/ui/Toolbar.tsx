import React, { useCallback } from "react";
import { observer } from "mobx-react-lite";

import type { PlaceableEntityConfig } from "@/shared/types/toolTypes";
import { useStore } from "@/app";

// ── Иконки инструментов ──────────────────────────────────────────────────────

const PanIcon: React.FC = () => (
    <svg viewBox="0 0 18 18" width={18} height={18} fill="currentColor">
        <path d="M9 1L7 4h4L9 1zM9 17l-2-3h4l-2 3zM1 9l3-2v4L1 9zM17 9l-3-2v4l3-2z" />
        <path d="M9 4v10M4 9h10" stroke="currentColor" strokeWidth={1} fill="none" />
    </svg>
);

const SelectIcon: React.FC = () => (
    <svg viewBox="0 0 18 18" width={18} height={18} fill="currentColor">
        <path d="M3 2l5 13 2.5-4.5L15 16l1.5-1.5-4.5-4.5L16 7.5 3 2z" />
    </svg>
);

const PoleIcon: React.FC<{ shape: "circle" | "square"; label: string }> = ({ shape, label }) => (
    <svg viewBox="0 0 20 20" width={20} height={20}>
        {shape === "circle"
            ? <circle cx={8} cy={9} r={6} fill="none" stroke="currentColor" strokeWidth={1.5} />
            : <rect x={2} y={3} width={12} height={12} fill="none" stroke="currentColor" strokeWidth={1.5} />
        }
        <text x={19} y={19} fontSize={7} fontFamily="monospace" fill="currentColor" textAnchor="end">{label}</text>
    </svg>
);

// ── Определения инструментов ──────────────────────────────────────────────────

interface ToolDef {
    id: string;
    label: string;
    shortcut: string;
    icon: React.ReactNode;
    group: "navigation" | "objects" | "wires" | "misc";
    action: (uiStore: any) => void;
    isActive: (toolState: any) => boolean;
}

const TOOL_DEFINITIONS: ToolDef[] = [
    {
        id: "pan",
        label: "Перемещение холста",
        shortcut: "ESC",
        icon: <PanIcon />,
        group: "navigation",
        action: (ui) => ui.resetToPan(),
        isActive: (ts) => ts.tool === "panTool",
    },
    {
        id: "select",
        label: "Выделение",
        shortcut: "",
        icon: <SelectIcon />,
        group: "navigation",
        action: (ui) => ui.resetToIdle(),
        isActive: (ts) => ts.tool === "idle" || ts.tool === "selection",
    },
    // ── Бетонные опоры КС ──────────────────────────────────────────────────
    {
        id: "pole-cs-concrete-single",
        label: "Опора КС, однопутная, бетонная",
        shortcut: "P",
        icon: <PoleIcon shape="circle" label="О" />,
        group: "objects",
        action: (ui) => ui.startPlacement({
            kind: "catenaryPole", consoleType: "single", material: "concrete",
        } satisfies PlaceableEntityConfig),
        isActive: (ts) =>
            ts.tool === "placement" &&
            ts.entityConfig.kind === "catenaryPole" &&
            ts.entityConfig.consoleType === "single" &&
            (ts.entityConfig.material ?? "concrete") === "concrete",
    },
    {
        id: "pole-cs-concrete-double",
        label: "Опора КС, в междупутье, бетонная",
        shortcut: "",
        icon: <PoleIcon shape="circle" label="М" />,
        group: "objects",
        action: (ui) => ui.startPlacement({
            kind: "catenaryPole", consoleType: "double", material: "concrete",
        } satisfies PlaceableEntityConfig),
        isActive: (ts) =>
            ts.tool === "placement" &&
            ts.entityConfig.kind === "catenaryPole" &&
            ts.entityConfig.consoleType === "double" &&
            (ts.entityConfig.material ?? "concrete") === "concrete",
    },
    // ── Металлические опоры КС ─────────────────────────────────────────────
    {
        id: "pole-cs-metal-single",
        label: "Опора КС, однопутная, металлическая",
        shortcut: "",
        icon: <PoleIcon shape="square" label="О" />,
        group: "objects",
        action: (ui) => ui.startPlacement({
            kind: "catenaryPole", consoleType: "single", material: "metal",
        } satisfies PlaceableEntityConfig),
        isActive: (ts) =>
            ts.tool === "placement" &&
            ts.entityConfig.kind === "catenaryPole" &&
            ts.entityConfig.consoleType === "single" &&
            ts.entityConfig.material === "metal",
    },
    {
        id: "pole-cs-metal-double",
        label: "Опора КС, в междупутье, металлическая",
        shortcut: "",
        icon: <PoleIcon shape="square" label="М" />,
        group: "objects",
        action: (ui) => ui.startPlacement({
            kind: "catenaryPole", consoleType: "double", material: "metal",
        } satisfies PlaceableEntityConfig),
        isActive: (ts) =>
            ts.tool === "placement" &&
            ts.entityConfig.kind === "catenaryPole" &&
            ts.entityConfig.consoleType === "double" &&
            ts.entityConfig.material === "metal",
    },
    // ── Опоры ВЛ ───────────────────────────────────────────────────────────
    {
        id: "pole-vl-intermediate",
        label: "Опора ВЛ (промежуточная)",
        shortcut: "",
        icon: <svg viewBox="0 0 18 18" width={18} height={18}><circle cx={9} cy={9} r={7} fill="none" stroke="currentColor" strokeWidth={1.5} /></svg>,
        group: "objects",
        action: (ui) => ui.startPlacement({ kind: "vlPole", vlType: "intermediate" } satisfies PlaceableEntityConfig),
        isActive: (ts) => ts.tool === "placement" && ts.entityConfig.kind === "vlPole" && ts.entityConfig.vlType === "intermediate",
    },
    {
        id: "pole-vl-angular",
        label: "Опора ВЛ (угловая)",
        shortcut: "",
        icon: <svg viewBox="0 0 18 18" width={18} height={18}><polygon points="9,2 16,15 2,15" fill="none" stroke="currentColor" strokeWidth={1.5} /></svg>,
        group: "objects",
        action: (ui) => ui.startPlacement({ kind: "vlPole", vlType: "angular" } satisfies PlaceableEntityConfig),
        isActive: (ts) => ts.tool === "placement" && ts.entityConfig.kind === "vlPole" && ts.entityConfig.vlType === "angular",
    },
    {
        id: "pole-vl-terminal",
        label: "Опора ВЛ (концевая)",
        shortcut: "",
        icon: <svg viewBox="0 0 18 18" width={18} height={18}><rect x={3} y={3} width={12} height={12} fill="none" stroke="currentColor" strokeWidth={1.5} /></svg>,
        group: "objects",
        action: (ui) => ui.startPlacement({ kind: "vlPole", vlType: "terminal" } satisfies PlaceableEntityConfig),
        isActive: (ts) => ts.tool === "placement" && ts.entityConfig.kind === "vlPole" && ts.entityConfig.vlType === "terminal",
    },
];

const GROUPS: Array<{ id: string; label: string }> = [
    { id: "navigation", label: "Навигация" },
    { id: "objects", label: "Опоры" },
    { id: "wires", label: "Провода" },
    { id: "misc", label: "Прочее" },
];

// ── ToolButton ────────────────────────────────────────────────────────────────

interface ToolButtonProps {
    def: ToolDef;
    isActive: boolean;
    onClick: () => void;
}

const ToolButton: React.FC<ToolButtonProps> = React.memo(({ def, isActive, onClick }) => (
    <button
        type="button"
        className={`toolbar-button ${isActive ? "toolbar-button--active" : ""}`}
        onClick={onClick}
        title={`${def.label}${def.shortcut ? ` (${def.shortcut})` : ""}`}
    >
        {def.icon}
    </button>
));

ToolButton.displayName = "ToolButton";

// ── Toolbar ───────────────────────────────────────────────────────────────────

export const Toolbar: React.FC = observer(() => {
    const { uiStore } = useStore();

    const handleClick = useCallback((def: ToolDef) => {
        def.action(uiStore);
    }, [uiStore]);

    return (
        <div className="toolbar">
            {GROUPS.map((group) => {
                const tools = TOOL_DEFINITIONS.filter((t) => t.group === group.id);
                if (tools.length === 0) return null;
                return (
                    <div key={group.id} className="toolbar-group">
                        <div className="toolbar-group-label">{group.label}</div>
                        <div className="toolbar-group-buttons">
                            {tools.map((def) => (
                                <ToolButton
                                    key={def.id}
                                    def={def}
                                    isActive={def.isActive(uiStore.toolState)}
                                    onClick={() => handleClick(def)}
                                />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
});

Toolbar.displayName = "Toolbar";
