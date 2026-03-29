import { type FC, useEffect, useRef, useCallback } from "react";
import { observer } from "mobx-react-lite";
import { reaction } from "mobx";
import { NumberInput, TextInput } from "@mantine/core";

import { useStore } from "@/app/lib/storeContext";
import { useServices } from "@/app/lib/servicesContext";

import type { EntityService } from "@/app/services/EntityService";
import type { InlineEditStore, InlineEditTarget } from "@/app/store/InlineEditStore";

function commitAndClose(
    store: InlineEditStore,
    entityService: EntityService,
    rawValue: string | null,
    shiftKey: boolean,
): void {
    const { editing } = store;
    if (!editing) {
        return;
    }

    const { target, initialValue } = editing;

    if (rawValue === null || rawValue === initialValue) {
        store.commitEdit();
        return;
    }

    applyEdit(entityService, target, rawValue, shiftKey);
    store.commitEdit();
}

function applyEdit(entityService: EntityService, target: InlineEditTarget, rawValue: string, shiftKey: boolean): void {
    if (target.kind === "poleName") {
        const trimmed = rawValue.trim();
        if (trimmed.length === 0) {
            return;
        }
        entityService.renamePole(target.poleId, trimmed);
    } else if (target.kind === "zigzagValue") {
        const num = Number(rawValue);
        if (Number.isNaN(num)) {
            return;
        }
        entityService.setFixingPointZigzag(target.fixingPointId, num);
    } else if (target.kind === "spanLength") {
        const num = Number(rawValue);
        if (Number.isNaN(num) || num <= 0) {
            return;
        }
        entityService.setSpanLength(target.leftFpId, target.rightFpId, target.trackId, num, shiftKey);
    }
}

const InlineEditOverlayBase: FC = () => {
    const { inlineEditStore, cameraStore } = useStore();
    const { entityService } = useServices();

    const inputRef = useRef<HTMLInputElement>(null);
    const escapedRef = useRef(false);

    // Закрыть редактор при zoom/pan
    useEffect(
        () =>
            reaction(
                () => cameraStore.viewBox,
                () => {
                    if (inlineEditStore.editing) {
                        commitAndClose(inlineEditStore, entityService, inputRef.current?.value ?? null, false);
                    }
                },
            ),
        [inlineEditStore, cameraStore, entityService],
    );

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter") {
                e.preventDefault();
                commitAndClose(inlineEditStore, entityService, inputRef.current?.value ?? null, e.shiftKey);
            } else if (e.key === "Escape") {
                e.stopPropagation();
                escapedRef.current = true;
                inlineEditStore.cancelEdit();
            }
        },
        [inlineEditStore, entityService],
    );

    const handleBlur = useCallback(() => {
        if (escapedRef.current) {
            escapedRef.current = false;
            return;
        }
        commitAndClose(inlineEditStore, entityService, inputRef.current?.value ?? null, false);
    }, [inlineEditStore, entityService]);

    const { editing } = inlineEditStore;
    if (!editing) {
        return null;
    }

    const { target, screenPos, initialValue } = editing;

    const commonProps = {
        ref: inputRef,
        size: "xs" as const,
        autoFocus: true,
        defaultValue: initialValue,
        onKeyDown: handleKeyDown,
        onBlur: handleBlur,
        styles: { input: { width: 80, textAlign: "center" as const } },
    };

    return (
        <div
            style={{
                position: "absolute",
                left: screenPos.x,
                top: screenPos.y,
                transform: "translate(-50%, -50%)",
                zIndex: 10,
            }}
        >
            {target.kind === "poleName" ? (
                <TextInput {...commonProps} />
            ) : (
                <NumberInput
                    {...commonProps}
                    step={target.kind === "zigzagValue" ? 10 : 1}
                    min={target.kind === "spanLength" ? 1 : undefined}
                />
            )}
        </div>
    );
};

export const InlineEditOverlay = observer(InlineEditOverlayBase);
