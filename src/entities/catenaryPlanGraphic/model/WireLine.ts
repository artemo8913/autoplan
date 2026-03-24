import { makeAutoObservable } from "mobx";

import type { WireType } from "@/shared/types/catenaryTypes";

import type { FixingPoint } from "./FixingPoint";

export class WireLine {
    readonly id: string;
    wireType: WireType;
    label?: string;
    fixingPoints: FixingPoint[];

    constructor(params: { id?: string; wireType: WireType; label?: string; fixingPoints: FixingPoint[] }) {
        this.id = params.id ?? crypto.randomUUID();
        this.wireType = params.wireType;
        this.label = params.label;
        this.fixingPoints = params.fixingPoints;
        makeAutoObservable(this, { id: false });
    }

    setWireType(wireType: WireType): void {
        this.wireType = wireType;
    }

    setLabel(label: string | undefined): void {
        this.label = label;
    }

    addFixingPoint(fp: FixingPoint): void {
        this.fixingPoints.push(fp);
    }

    moveFixingPoint(fpId: string, direction: "up" | "down"): void {
        const idx = this.fixingPoints.findIndex((fp) => fp.id === fpId);

        if (idx === -1) {
            return;
        }

        const target = direction === "up" ? idx - 1 : idx + 1;

        if (target < 0 || target >= this.fixingPoints.length) {
            return;
        }

        const arr = [...this.fixingPoints];
        [arr[idx], arr[target]] = [arr[target], arr[idx]];
        this.fixingPoints = arr;
    }

    insertFixingPointAfter(afterFpId: string, fp: FixingPoint): void {
        const idx = this.fixingPoints.findIndex((f) => f.id === afterFpId);
        const arr = [...this.fixingPoints];
        arr.splice(idx + 1, 0, fp);
        this.fixingPoints = arr;
    }

    removeFixingPoint(fpId: string): void {
        this.fixingPoints = this.fixingPoints.filter((fp) => fp.id !== fpId);
    }
}
