import React from "react";
import { observer } from "mobx-react-lite";

import { useStore } from "@/app";
import { PanIcon, SelectIcon, PoleIcon } from "@/shared/ui/toolbar-icons";

// ── ToolButton ────────────────────────────────────────────────────────────────

interface ToolButtonProps {
    label: string;
    icon: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
}

const ToolButton: React.FC<ToolButtonProps> = React.memo(({ label, icon, isActive, onClick }) => (
    <button
        type="button"
        className={`toolbar-button ${isActive ? "toolbar-button--active" : ""}`}
        onClick={onClick}
        title={label}
    >
        {icon}
    </button>
));

ToolButton.displayName = "ToolButton";

// ── Toolbar ───────────────────────────────────────────────────────────────────

export const Toolbar: React.FC = observer(() => {
    const { uiStore } = useStore();
    const ts = uiStore.toolState;

    const isPan = ts.tool === "panTool";
    const isSelect = ts.tool === "idle" || ts.tool === "selection";

    const cfg = ts.tool === "placement" ? ts.entityConfig : null;

    const isKsConcrete = cfg?.kind === "catenaryPole" && (cfg.material ?? "concrete") === "concrete";
    const isKsMetal = cfg?.kind === "catenaryPole" && cfg.material === "metal";
    const isVlIntermediate = cfg?.kind === "vlPole" && cfg.vlType === "intermediate";
    const isVlAngular = cfg?.kind === "vlPole" && cfg.vlType === "angular";
    const isVlTerminal = cfg?.kind === "vlPole" && cfg.vlType === "terminal";

    return (
        <div className="toolbar">
            {/* ── Навигация ── */}
            <div className="toolbar-group">
                <div className="toolbar-group-label">Навигация</div>
                <div className="toolbar-group-buttons">
                    <ToolButton
                        label="Перемещение холста (ESC)"
                        icon={<PanIcon />}
                        isActive={isPan}
                        onClick={() => uiStore.resetToPan()}
                    />
                    <ToolButton
                        label="Выделение"
                        icon={<SelectIcon />}
                        isActive={isSelect}
                        onClick={() => uiStore.resetToIdle()}
                    />
                </div>
            </div>

            {/* ── Опоры ── */}
            <div className="toolbar-group">
                <div className="toolbar-group-label">Опоры</div>
                <div className="toolbar-group-buttons">
                    <ToolButton
                        label="Опора КС, бетонная (P)"
                        icon={<PoleIcon shape="circle" label="КС" />}
                        isActive={isKsConcrete}
                        onClick={() => uiStore.startPlacement({ kind: "catenaryPole", material: "concrete" })}
                    />
                    <ToolButton
                        label="Опора КС, металлическая"
                        icon={<PoleIcon shape="square" label="КС" />}
                        isActive={isKsMetal}
                        onClick={() => uiStore.startPlacement({ kind: "catenaryPole", material: "metal" })}
                    />
                    <ToolButton
                        label="Опора ВЛ (промежуточная)"
                        icon={<PoleIcon shape="circle" label="ВЛ" />}
                        isActive={isVlIntermediate}
                        onClick={() => uiStore.startPlacement({ kind: "vlPole", vlType: "intermediate" })}
                    />
                    <ToolButton
                        label="Опора ВЛ (угловая)"
                        icon={<PoleIcon shape="triangle" label="ВЛ" />}
                        isActive={isVlAngular}
                        onClick={() => uiStore.startPlacement({ kind: "vlPole", vlType: "angular" })}
                    />
                    <ToolButton
                        label="Опора ВЛ (концевая)"
                        icon={<PoleIcon shape="square" label="ВЛ" />}
                        isActive={isVlTerminal}
                        onClick={() => uiStore.startPlacement({ kind: "vlPole", vlType: "terminal" })}
                    />
                </div>
            </div>
        </div>
    );
});

Toolbar.displayName = "Toolbar";
