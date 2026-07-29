import { makeAutoObservable } from "mobx";

import type { WireType } from "@/shared/types/catenaryTypes";

import type { FixingPoint } from "./FixingPoint";
import { moveFixingPoint, insertFixingPointAfter, removeFixingPoint } from "../lib/fixingPointListOps";

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
        this.fixingPoints = moveFixingPoint(this.fixingPoints, fpId, direction);
    }

    insertFixingPointAfter(afterFpId: string, fp: FixingPoint): void {
        this.fixingPoints = insertFixingPointAfter(this.fixingPoints, afterFpId, fp);
    }

    removeFixingPoint(fpId: string): void {
        this.fixingPoints = removeFixingPoint(this.fixingPoints, fpId);
    }
}
