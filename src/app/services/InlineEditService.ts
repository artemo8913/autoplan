import { screenToSvg, svgToScreen } from "@/shared/svg/svgCoords";

import type { PolesStore } from "../store/PolesStore";
import type { FixingPointsStore } from "../store/FixingPointsStore";
import type { UndoStackStore } from "../store/UndoStackStore";
import type { InlineEditStore } from "../store/InlineEditStore";
import type { HitTestService } from "./HitTestService";

export class InlineEditService {
    constructor(
        private readonly polesStore: PolesStore,
        private readonly fixingPointsStore: FixingPointsStore,
        private readonly undoStackStore: UndoStackStore,
        private readonly inlineEditStore: InlineEditStore,
        private readonly hitTestService: HitTestService,
    ) {}

    renamePole(poleId: string, newName: string): void {
        const pole = this.polesStore.poles.get(poleId);
        if (!pole) {
            return;
        }

        const oldName = pole.name;
        this.undoStackStore.execute({
            description: `Переименование опоры: ${oldName} → ${newName}`,
            execute: () => pole.setName(newName),
            undo: () => pole.setName(oldName),
        });
    }

    setFixingPointZigzag(fpId: string, newValue: number | undefined): void {
        const fp = this.fixingPointsStore.fixingPoints.get(fpId);
        if (!fp) {
            return;
        }

        const oldValue = fp.zigzagValue;
        this.undoStackStore.execute({
            description: `Изменение зигзага: ${oldValue ?? "—"} → ${newValue ?? "—"}`,
            execute: () => fp.setZigzagValue(newValue),
            undo: () => fp.setZigzagValue(oldValue),
        });
    }

    setSpanLength(leftFpId: string, rightFpId: string, trackId: string, newLength: number, shiftChain: boolean): void {
        const leftFp = this.fixingPointsStore.fixingPoints.get(leftFpId);
        const rightFp = this.fixingPointsStore.fixingPoints.get(rightFpId);
        if (!leftFp || !rightFp) {
            return;
        }

        const leftPole = leftFp.pole;
        const rightPole = rightFp.pole;
        const direction = Math.sign(rightPole.x - leftPole.x) || 1;
        const targetX = Math.round(leftPole.x + direction * newLength);
        const delta = targetX - rightPole.x;

        if (delta === 0) {
            return;
        }

        const oldSpan = Math.abs(rightPole.x - leftPole.x);

        if (shiftChain) {
            const snapshots = new Map<string, number>();
            for (const pole of this.polesStore.list) {
                if (pole.tracks[trackId] && pole.x >= rightPole.x) {
                    snapshots.set(pole.id, pole.x);
                }
            }

            this.undoStackStore.execute({
                description: `Длина пролёта (цепочка): ${oldSpan} → ${newLength}`,
                execute: () => {
                    for (const [id, origX] of snapshots) {
                        this.polesStore.poles.get(id)?.setX(origX + delta);
                    }
                },
                undo: () => {
                    for (const [id, origX] of snapshots) {
                        this.polesStore.poles.get(id)?.setX(origX);
                    }
                },
            });
        } else {
            const rightCp = this.polesStore.poles.get(rightPole.id);
            if (!rightCp) {
                return;
            }

            const oldX = rightCp.x;
            this.undoStackStore.execute({
                description: `Длина пролёта: ${oldSpan} → ${newLength}`,
                execute: () => rightCp.setX(targetX),
                undo: () => rightCp.setX(oldX),
            });
        }
    }

    tryStartEdit(svgElement: SVGSVGElement, clientX: number, clientY: number): void {
        const svgPos = screenToSvg(svgElement, clientX, clientY);
        const target = this.hitTestService.hitTestEditTarget(svgPos);
        if (!target) {
            return;
        }

        const screenPos = svgToScreen(svgElement, target.svgPos.x, target.svgPos.y);
        const container = svgElement.parentElement;
        if (!container) {
            return;
        }

        const rect = container.getBoundingClientRect();
        const containerPos = { x: screenPos.x - rect.left, y: screenPos.y - rect.top };

        this.inlineEditStore.startEdit({
            target: target.editTarget,
            screenPos: containerPos,
            initialValue: target.initialValue,
        });
    }
}
